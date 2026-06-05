from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from io import BytesIO, StringIO
import csv
import re

import pandas as pd

from app.models.expertise import Expertise, Title
from app.services.title_resolver import resolve_title_from_titles

EXTERNAL_SOURCE_VALUES = {"external hire", "tuyen ngoai", "tuyển ngoài"}


@dataclass(frozen=True)
class UploadedEmployee:
    employee_id: str
    raw_title: str
    expertise_group: str | None
    expertise_segment: str | None
    training_source: str | None


@dataclass(frozen=True)
class PaidRadarReport:
    filename: str
    content: bytes
    employee_count: int
    resolved_count: int


def normalize_column(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


def first_present(row: pd.Series, column_map: dict[str, str], keys: list[str]) -> str | None:
    for key in keys:
        column = column_map.get(key)
        if column is None:
            continue
        value = row.get(column)
        if pd.isna(value):
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def load_uploaded_employee_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix == "csv":
        return pd.read_csv(BytesIO(content), encoding="utf-8-sig")
    if suffix in {"xlsx", "xls"}:
        return pd.read_excel(BytesIO(content))
    raise ValueError("Only CSV/XLSX employee files are supported")


def parse_uploaded_employees(df: pd.DataFrame) -> list[UploadedEmployee]:
    column_map = {normalize_column(column): column for column in df.columns}
    employees: list[UploadedEmployee] = []

    for index, row in df.iterrows():
        raw_title = first_present(
            row,
            column_map,
            ["rawtitle", "title", "jobtitle", "chucdanh", "chucdanhtienganh"],
        )
        if not raw_title:
            continue

        employee_id = first_present(
            row,
            column_map,
            ["employeeid", "id", "code", "employeecode", "manhanvien"],
        ) or f"ROW{index + 1:04d}"
        employees.append(
            UploadedEmployee(
                employee_id=employee_id,
                raw_title=raw_title,
                expertise_group=first_present(
                    row, column_map, ["expertisegroup", "group", "department"]
                ),
                expertise_segment=first_present(
                    row, column_map, ["expertisesegment", "segment"]
                ),
                training_source=first_present(
                    row, column_map, ["trainingsource", "source", "hiringtype"]
                ),
            )
        )

    if not employees:
        raise ValueError("No analyzable employee rows found. Include a title/raw_title column.")
    return employees


def is_external_source(value: str | None) -> bool:
    if not value:
        return False
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    return any(marker in normalized for marker in EXTERNAL_SOURCE_VALUES)


def build_paid_radar_report(
    employees: list[UploadedEmployee],
    titles: list[Title],
    expertises: list[Expertise],
) -> PaidRadarReport:
    expertise_names = {expertise.code: expertise.name for expertise in expertises}
    ceiling = {
        expertise.code: int((expertise.ceiling_prof or "L5").replace("L", "") or 5)
        for expertise in expertises
    }

    pyramid: Counter[tuple[str, str, int]] = Counter()
    by_segment: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "external": 0})
    unresolved: list[UploadedEmployee] = []
    branch_eligible: list[tuple[UploadedEmployee, str, int]] = []
    resolved_rows: list[tuple[UploadedEmployee, str, str, int, float]] = []

    for employee in employees:
        resolved = resolve_title_from_titles(employee.raw_title, titles)
        if not resolved.expertise_code or not resolved.track or resolved.level is None:
            unresolved.append(employee)
            continue

        pyramid[(resolved.expertise_code, resolved.track, resolved.level)] += 1
        segment = employee.expertise_segment or "Unknown"
        by_segment[segment]["total"] += 1
        if is_external_source(employee.training_source):
            by_segment[segment]["external"] += 1

        ceiling_level = min(ceiling.get(resolved.expertise_code, 5), 3)
        if resolved.track == "Professional" and resolved.level == ceiling_level:
            branch_eligible.append((employee, resolved.expertise_code, resolved.level))

        resolved_rows.append(
            (
                employee,
                resolved.expertise_code,
                resolved.track,
                resolved.level,
                resolved.confidence,
            )
        )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["section", "metric", "value", "extra"])
    writer.writerow(["summary", "price_vnd", "3000", "per analysis"])
    writer.writerow(["summary", "employee_rows", len(employees), "uploaded"])
    writer.writerow(["summary", "resolved_rows", len(resolved_rows), "matched to career titles"])
    writer.writerow(["summary", "unresolved_rows", len(unresolved), "review title mapping"])

    writer.writerow([])
    writer.writerow(["pyramid", "expertise", "track", "level", "count"])
    for (expertise_code, track, level), count in sorted(pyramid.items()):
        writer.writerow(
            [
                "pyramid",
                expertise_names.get(expertise_code, expertise_code),
                track,
                level,
                count,
            ]
        )

    writer.writerow([])
    writer.writerow(["dependency", "segment", "external_hire_ratio", "internal_pipeline_count"])
    for segment, values in sorted(by_segment.items()):
        total = values["total"]
        external = values["external"]
        ratio = external / total if total else 0
        writer.writerow(["dependency", segment, f"{ratio:.2f}", total - external])

    writer.writerow([])
    writer.writerow(["branch_eligible", "employee_id", "expertise_code", "current_level"])
    for employee, expertise_code, level in branch_eligible:
        writer.writerow(["branch_eligible", employee.employee_id, expertise_code, level])

    writer.writerow([])
    writer.writerow(["resolved_rows", "employee_id", "raw_title", "expertise_code", "track", "level", "confidence"])
    for employee, expertise_code, track, level, confidence in resolved_rows:
        writer.writerow(
            [
                "resolved_rows",
                employee.employee_id,
                employee.raw_title,
                expertise_code,
                track,
                level,
                f"{confidence:.2f}",
            ]
        )

    writer.writerow([])
    writer.writerow(["unresolved_rows", "employee_id", "raw_title"])
    for employee in unresolved:
        writer.writerow(["unresolved_rows", employee.employee_id, employee.raw_title])

    return PaidRadarReport(
        filename="talent_radar_report.csv",
        content=output.getvalue().encode("utf-8-sig"),
        employee_count=len(employees),
        resolved_count=len(resolved_rows),
    )
