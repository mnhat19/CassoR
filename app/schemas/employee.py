from __future__ import annotations

from pydantic import BaseModel

from app.schemas.career import CareerPathResponse


class TitleResolveRequest(BaseModel):
    raw_title: str


class TitleResolveResponse(BaseModel):
    matched_title: str | None
    track: str | None
    level: int | None
    expertise_code: str | None
    confidence: float


class PrecedentSchema(BaseModel):
    training_source: str | None
    track: str | None
    level: int | None
    age_at_promotion: int | None
    expertise: str | None


class MyCareerPathResponse(CareerPathResponse):
    current_node_id: str | None
