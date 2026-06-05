from __future__ import annotations

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    id: int
    username: str
    role: str
    display_name: str | None
    employee_id: int | None = None
    employee_code: str | None = None
    employee_number: str | None = None
    full_name: str | None = None
    raw_title: str | None = None
    title: str | None = None
    expertise_group: str | None = None
    expertise_segment: str | None = None


class AuthResponse(BaseModel):
    token: str
    user: UserProfile


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)
    display_name: str | None = Field(default=None, max_length=255)
    employee_code: str | None = Field(default=None, max_length=50)
