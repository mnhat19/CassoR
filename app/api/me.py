from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.employee import User
from app.models.employee import Employee
from app.schemas.employee import (
    MyCareerPathResponse,
    PrecedentSchema,
    TitleResolveRequest,
    TitleResolveResponse,
)
from app.services.career_path import build_career_path
from app.services.auth import get_current_user
from app.services.title_resolver import resolve_title, resolve_title_from_titles
from app.models.expertise import Title

router = APIRouter(tags=["me"])


@router.post("/resolve-title")
async def resolve_title_endpoint(
    payload: TitleResolveRequest,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
) -> TitleResolveResponse:
    resolved = await resolve_title(payload.raw_title, session)
    return TitleResolveResponse(
        matched_title=resolved.matched_title,
        track=resolved.track,
        level=resolved.level,
        expertise_code=resolved.expertise_code,
        confidence=resolved.confidence,
    )


@router.get("/path")
async def get_my_path(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> MyCareerPathResponse:
    if user.employee_id is None:
        raise HTTPException(status_code=404, detail="User is not linked to an employee")

    result = await session.execute(select(Employee).where(Employee.id == user.employee_id))
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    raw_title = employee.raw_title or employee.title or ""
    resolved = await resolve_title(raw_title, session)
    if not resolved.expertise_code:
        raise HTTPException(status_code=404, detail="Expertise not resolved")

    career_path = await build_career_path(resolved.expertise_code, session)
    current_node_id = None
    if resolved.track and resolved.level is not None:
        for node in career_path.nodes:
            if node.track == resolved.track and node.level == resolved.level:
                current_node_id = node.id
                break

    return MyCareerPathResponse(
        expertise=career_path.expertise,
        nodes=career_path.nodes,
        edges=career_path.edges,
        current_node_id=current_node_id,
    )


@router.get("/precedents")
async def get_precedents(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
) -> list[PrecedentSchema]:
    employee_rows = await session.execute(select(Employee).order_by(Employee.id))
    employees = list(employee_rows.scalars().all())

    title_rows = await session.execute(select(Title))
    titles = list(title_rows.scalars().all())

    precedents: list[PrecedentSchema] = []
    for employee in employees:
        raw_title = employee.raw_title or employee.title or ""
        resolved = resolve_title_from_titles(raw_title, titles)
        precedents.append(
            PrecedentSchema(
                training_source=employee.training_source,
                track=resolved.track,
                level=resolved.level,
                age_at_promotion=None,
                expertise=resolved.expertise_code,
            )
        )

    return precedents
