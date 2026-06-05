"""Parse uploaded HR data (xlsx/csv) and run Talent Radar analysis on it.

Supports flexible column naming (Vietnamese and English).
The uploaded file must have at minimum: employee identifier + job title.
"""
from __future__ import annotations

import io
from collections import defaultdict
from dataclasses import dataclass

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expertise import Expertise, Title
from app.schemas.radar import DependencyReport, PyramidEntry
from app.services.stagnation import parse_ceiling
from app.services.title_resolver import resolve_title_from_titles

# Flexible column mapping: internal_field → list of accepted column names
COLUMN_ALIASES: dict[str, list[str]] = {
    "employee_id": ["employee_id", "Mã NV", "Ma NV", "ID", "Mã nhân viên"],
    "full_name": ["full_name", "Họ và tên", "Ho va ten", "Tên", "Name", "Họ tên"],
    "raw_title": ["raw_title", "Chức danh", "Chuc danh", "Title", "Chức vụ", "raw title"],
    "expertise_group": ["expertise_group", "Nhóm chuyên môn", "Nhom chuyen mon", "Expertise Group", "Nhóm CM"],
    "expertise_segment": ["expertise_segment", "Phân khúc", "Phan khuc", "Segment", "Nhóm"],
    "training_source": ["training_source", "Nguồn tuyển", "Nguon tuyen", "Training Source", "Nguồn", "Source"],
}


@dataclass
class UploadedEmployee:
    employee_id: str
    full_name: str
    raw_title: str
    expertise_group: str | None
    expertise_segment: str | None
    training_source: str | None


def _normalize_df(df: pd.DataFrame) -> pd.DataFrame:
    """Map uploaded column names to internal field names."""
    existing = {c.strip(): c for c in df.columns}
    rename_map: dict[str, str] = {}

    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in existing:
                rename_map[existing[alias]] = field
                break

    df = df.rename(columns=rename_map)

    for field in COLUMN_ALIASES:
        if field not in df.columns:
            df[field] = None

    return df


def parse_hr_file(content: bytes, filename: str) -> list[UploadedEmployee]:
    buf = io.BytesIO(content)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(buf, encoding="utf-8-sig")
    else:
        df = pd.read_excel(buf)

    df = _normalize_df(df)
    df = df.where(pd.notna(df), None)

    employees: list[UploadedEmployee] = []
    for i, row in df.iterrows():
        emp_id = str(row.get("employee_id") or f"EMP{i+1:03d}").strip()
        raw_title = str(row.get("raw_title") or "").strip()
        if not raw_title:
            continue  # skip rows without job title

        employees.append(
            UploadedEmployee(
                employee_id=emp_id,
                full_name=str(row.get("full_name") or emp_id).strip(),
                raw_title=raw_title,
                expertise_group=str(row.get("expertise_group")).strip() if row.get("expertise_group") else None,
                expertise_segment=str(row.get("expertise_segment")).strip() if row.get("expertise_segment") else None,
                training_source=str(row.get("training_source")).strip() if row.get("training_source") else None,
            )
        )

    return employees


async def run_radar_analysis(
    employees: list[UploadedEmployee],
    session: AsyncSession,
) -> dict:
    """Run all 4 radar analyses on uploaded employee list. Returns structured result dict."""
    title_rows = await session.execute(select(Title))
    titles = list(title_rows.scalars().all())

    expertise_rows = await session.execute(
        select(Expertise.code, Expertise.name, Expertise.ceiling_prof, Expertise.flag, Expertise.group_name)
    )
    expertise_data = list(expertise_rows.all())
    expertise_map = {code: name for code, name, _, _, _ in expertise_data}
    ceiling_map = {
        code: parse_ceiling(ceiling_prof, flag)
        for code, _, ceiling_prof, flag, _ in expertise_data
    }

    # 1. Pyramid
    pyramid_counts: dict[tuple[str, str, int], int] = defaultdict(int)
    for emp in employees:
        resolved = resolve_title_from_titles(emp.raw_title, titles)
        if not resolved.expertise_code or not resolved.track or resolved.level is None:
            continue
        key = (resolved.expertise_code, resolved.track, resolved.level)
        pyramid_counts[key] += 1

    pyramid: list[dict] = []
    for (expertise_code, track, level), count in pyramid_counts.items():
        pyramid.append({
            "expertise_code": expertise_code,
            "expertise_name": expertise_map.get(expertise_code, expertise_code),
            "track": track,
            "level": level,
            "count": count,
        })

    # 2. Stagnation alerts (all at ceiling get base score 6)
    stagnation: list[dict] = []
    for emp in employees:
        resolved = resolve_title_from_titles(emp.raw_title, titles)
        if not resolved.expertise_code or not resolved.track or resolved.level is None:
            continue
        ceiling_level = min(ceiling_map.get(resolved.expertise_code, 5), 3)
        is_at_ceiling = resolved.track == "Professional" and resolved.level == ceiling_level
        score = 6 if is_at_ceiling else 0
        if score > 0:
            stagnation.append({
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "score": score,
                "current_level": resolved.level,
                "months_stagnant": 0,
                "expertise_code": resolved.expertise_code,
            })

    # 3. Branch eligible (Professional at ceiling L≤3)
    branch_eligible: list[dict] = []
    for emp in employees:
        resolved = resolve_title_from_titles(emp.raw_title, titles)
        if not resolved.expertise_code or resolved.track != "Professional" or resolved.level is None:
            continue
        ceiling_level = min(ceiling_map.get(resolved.expertise_code, 5), 3)
        if resolved.level == ceiling_level:
            branch_eligible.append({
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "expertise_code": resolved.expertise_code,
                "current_level": resolved.level,
                "months_stagnant": 0,
            })

    # 4. Dependency (external hire ratio by segment)
    totals: dict[str, int] = defaultdict(int)
    externals: dict[str, int] = defaultdict(int)
    for emp in employees:
        segment = emp.expertise_segment or "Không xác định"
        totals[segment] += 1
        if emp.training_source and "external" in emp.training_source.lower():
            externals[segment] += 1

    dependency: list[dict] = []
    for segment, total in totals.items():
        ext = externals.get(segment, 0)
        dependency.append({
            "segment": segment,
            "total": total,
            "external_count": ext,
            "internal_count": total - ext,
            "external_hire_ratio": round(ext / total, 3) if total else 0.0,
        })

    return {
        "total_employees": len(employees),
        "pyramid": pyramid,
        "stagnation": stagnation,
        "branch_eligible": branch_eligible,
        "dependency": dependency,
    }
