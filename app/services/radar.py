from __future__ import annotations

from dataclasses import dataclass
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.expertise import Expertise, Title
from app.schemas.radar import DependencyReport, PyramidEntry
from app.services.stagnation import parse_ceiling
from app.services.title_resolver import resolve_title_from_titles


@dataclass(frozen=True)
class EmployeeSnapshot:
    employee_id: str
    expertise_code: str | None
    expertise_group: str | None
    expertise_segment: str | None
    training_source: str | None
    track: str | None
    level: int | None


def build_employee_snapshot(
    employee: Employee, titles: list[Title]
) -> EmployeeSnapshot:
    raw_title = employee.raw_title or employee.title or ""
    resolved = resolve_title_from_titles(raw_title, titles)
    return EmployeeSnapshot(
        employee_id=employee.employee_id,
        expertise_code=resolved.expertise_code,
        expertise_group=employee.expertise_group,
        expertise_segment=employee.expertise_segment,
        training_source=employee.training_source,
        track=resolved.track,
        level=resolved.level,
    )


async def build_pyramid(
    session: AsyncSession, expertise_group: str | None
) -> list[PyramidEntry]:
    employee_rows = await session.execute(select(Employee))
    employees = list(employee_rows.scalars().all())

    title_rows = await session.execute(select(Title))
    titles = list(title_rows.scalars().all())

    expertise_rows = await session.execute(select(Expertise.code, Expertise.name))
    expertise_map = {code: name for code, name in expertise_rows.all()}

    counts: dict[tuple[str, str, int], int] = defaultdict(int)
    for employee in employees:
        snapshot = build_employee_snapshot(employee, titles)
        if not snapshot.expertise_code:
            continue
        if expertise_group and snapshot.expertise_group != expertise_group:
            continue
        if not snapshot.track or snapshot.level is None:
            continue

        key = (snapshot.expertise_code, snapshot.track, snapshot.level)
        counts[key] += 1

    entries: list[PyramidEntry] = []
    for (expertise_code, track, level), count in counts.items():
        entries.append(
            PyramidEntry(
                expertise_code=expertise_code,
                expertise_name=expertise_map.get(expertise_code, expertise_code),
                track=track,
                level=level,
                count=count,
            )
        )

    return entries


async def build_dependency_report(session: AsyncSession) -> list[DependencyReport]:
    employee_rows = await session.execute(select(Employee))
    employees = list(employee_rows.scalars().all())

    totals: dict[str, int] = defaultdict(int)
    externals: dict[str, int] = defaultdict(int)

    for employee in employees:
        segment = employee.expertise_segment or "Unknown"
        totals[segment] += 1
        if employee.training_source == "External hire":
            externals[segment] += 1

    reports: list[DependencyReport] = []
    for segment, total in totals.items():
        external_count = externals.get(segment, 0)
        ratio = external_count / total if total else 0.0
        reports.append(
            DependencyReport(
                segment=segment,
                external_hire_ratio=ratio,
                internal_pipeline_count=total - external_count,
            )
        )

    return reports


async def build_branch_eligible_alerts(session: AsyncSession) -> list[dict]:
    employee_rows = await session.execute(select(Employee).order_by(Employee.id))
    employees = list(employee_rows.scalars().all())

    title_rows = await session.execute(select(Title))
    titles = list(title_rows.scalars().all())

    expertise_rows = await session.execute(
        select(Expertise.code, Expertise.ceiling_prof, Expertise.flag)
    )
    ceiling_map = {
        code: parse_ceiling(ceiling_prof, flag)
        for code, ceiling_prof, flag in expertise_rows.all()
    }

    alerts: list[dict] = []
    for employee in employees:
        snapshot = build_employee_snapshot(employee, titles)
        if (
            not snapshot.expertise_code
            or snapshot.track != "Professional"
            or snapshot.level is None
        ):
            continue

        ceiling_level = min(ceiling_map.get(snapshot.expertise_code, 5), 3)
        months_stagnant = 0
        if snapshot.level == ceiling_level and months_stagnant >= 6:
            alerts.append(
                {
                    "employee_id": employee.employee_id,
                    "expertise_code": snapshot.expertise_code,
                    "current_level": snapshot.level,
                    "months_stagnant": months_stagnant,
                }
            )

    return alerts
