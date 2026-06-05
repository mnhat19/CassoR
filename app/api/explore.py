from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.employee import User
from app.models.expertise import Expertise
from app.schemas.career import CareerPathResponse, ExpertiseSchema
from app.services.career_path import build_career_path
from app.services.auth import get_current_user, require_roles

router = APIRouter(tags=["explore"])


@router.get("/expertises")
async def list_expertises(
    segment: str | None = Query(default=None),
    enabled_only: bool = Query(default=False),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
) -> list[ExpertiseSchema]:
    stmt = select(Expertise)
    if segment:
        stmt = stmt.where(Expertise.segment == segment)
    if enabled_only:
        stmt = stmt.where(Expertise.enable.is_(True))
    result = await session.execute(stmt.order_by(Expertise.code))
    rows = result.scalars().all()
    return [
        ExpertiseSchema(
            code=row.code,
            name=row.name,
            group=row.group_name,
            segment=row.segment,
            enable=row.enable,
        )
        for row in rows
    ]


@router.get("/career-path/{expertise_code}")
async def get_career_path(
    expertise_code: str,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
) -> CareerPathResponse:
    return await build_career_path(expertise_code, session)


from app.schemas.career import TitleUpdate
from app.models.expertise import Title
from fastapi import HTTPException

@router.put("/titles/{title_id}")
async def update_title(
    title_id: int,
    payload: TitleUpdate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_roles("hr", "leadership")),
):
    result = await session.execute(select(Title).where(Title.id == title_id))
    title_obj = result.scalar_one_or_none()
    if not title_obj:
        raise HTTPException(status_code=404, detail="Title not found")

    if payload.desc is not None:
        title_obj.desc = payload.desc
    if payload.general_requirement is not None:
        title_obj.general_requirement = payload.general_requirement
    if payload.exp_requirement is not None:
        title_obj.exp_requirement = payload.exp_requirement

    await session.commit()
    return {"status": "success"}
