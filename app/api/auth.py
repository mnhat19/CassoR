from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models.employee import Employee, User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserProfile
from app.services.auth import (
    generate_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(tags=["auth"])


def build_user_profile(user: User) -> UserProfile:
    employee = user.employee
    return UserProfile(
        id=user.id,
        username=user.username,
        role=user.role,
        display_name=user.display_name,
        employee_id=employee.id if employee else None,
        employee_code=employee.code if employee else None,
        employee_number=employee.employee_id if employee else None,
        full_name=employee.full_name if employee else None,
        raw_title=employee.raw_title if employee else None,
        title=employee.title if employee else None,
        expertise_group=employee.expertise_group if employee else None,
        expertise_segment=employee.expertise_segment if employee else None,
    )


@router.post("/register")
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    username = payload.username.strip()
    existing = await session.execute(select(User).where(User.username == username))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    employee = None
    if payload.employee_code:
        employee_result = await session.execute(
            select(Employee).where(Employee.code == payload.employee_code.strip())
        )
        employee = employee_result.scalar_one_or_none()
        if employee is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee code not found",
            )

    user = User(
        username=username,
        password_hash=hash_password(payload.password),
        role="employee",
        employee=employee,
        display_name=payload.display_name.strip() if payload.display_name else None,
        token=generate_token(),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user, ["employee"])
    return AuthResponse(token=user.token or "", user=build_user_profile(user))


@router.post("/login")
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    result = await session.execute(
        select(User)
        .options(selectinload(User.employee))
        .where(User.username == payload.username.strip())
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    user.token = generate_token()
    await session.commit()
    await session.refresh(user, ["employee"])
    return AuthResponse(token=user.token or "", user=build_user_profile(user))


@router.get("/me")
async def get_profile(user: User = Depends(get_current_user)) -> UserProfile:
    return build_user_profile(user)


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    user.token = None
    await session.commit()
    return {"status": "success"}
