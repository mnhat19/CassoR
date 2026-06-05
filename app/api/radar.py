from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.employee import User
from app.schemas.radar import (
    BranchEligibleAlert,
    DependencyReport,
    PyramidEntry,
    StagnationAlert,
)
from app.services.radar import (
    build_branch_eligible_alerts,
    build_dependency_report,
    build_pyramid,
)
from app.services.stagnation import build_stagnation_alerts
from app.services.auth import require_roles

router = APIRouter(tags=["radar"])


@router.get("/pyramid")
async def get_pyramid(
    expertise_group: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_roles("hr", "leadership")),
) -> list[PyramidEntry]:
    return await build_pyramid(session, expertise_group)


@router.get("/alerts/branch-eligible")
async def get_branch_eligible(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_roles("hr", "leadership")),
) -> list[BranchEligibleAlert]:
    alerts = await build_branch_eligible_alerts(session)
    return [BranchEligibleAlert(**alert) for alert in alerts]


@router.get("/alerts/stagnation")
async def get_stagnation_alerts(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_roles("hr", "leadership")),
) -> list[StagnationAlert]:
    results = await build_stagnation_alerts(session)
    return [
        StagnationAlert(
            employee_id=item.employee_id,
            score=item.score,
            current_level=item.current_level,
            months_stagnant=item.months_stagnant,
        )
        for item in results
    ]


@router.get("/dependency")
async def get_dependency(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_roles("hr", "leadership")),
) -> list[DependencyReport]:
    return await build_dependency_report(session)
