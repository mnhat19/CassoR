from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.expertise import Expertise, Title
from app.services.title_resolver import resolve_title_from_titles


@dataclass(frozen=True)
class StagnationResult:
    employee_id: str
    score: int
    current_level: int
    months_stagnant: int


def parse_ceiling(ceiling: str | None, fallback_flag: str | None) -> int:
    if ceiling and ceiling.startswith("L"):
        return int(ceiling[1:])
    if fallback_flag:
        if fallback_flag.endswith("5"):
            return 5
        if fallback_flag.endswith("3"):
            return 3
        if fallback_flag.endswith("2"):
            return 2
    return 5


def calculate_months_stagnant() -> int:
    return 0


def calculate_stagnation_score(
    months_stagnant: int, is_professional_ceiling: bool
) -> int:
    bonus = 6 if is_professional_ceiling else 0
    return months_stagnant + bonus


async def build_stagnation_alerts(session: AsyncSession) -> list[StagnationResult]:
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

    alerts: list[StagnationResult] = []
    for employee in employees:
        raw_title = employee.raw_title or employee.title or ""
        resolved = resolve_title_from_titles(raw_title, titles)
        if not resolved.track or resolved.level is None or not resolved.expertise_code:
            continue

        months_stagnant = calculate_months_stagnant()
        ceiling_level = min(ceiling_map.get(resolved.expertise_code, 5), 3)
        is_professional_ceiling = (
            resolved.track == "Professional" and resolved.level == ceiling_level
        )
        score = calculate_stagnation_score(months_stagnant, is_professional_ceiling)

        if score <= 0:
            continue

        alerts.append(
            StagnationResult(
                employee_id=employee.employee_id,
                score=score,
                current_level=resolved.level,
                months_stagnant=months_stagnant,
            )
        )

    return alerts
