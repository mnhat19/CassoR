from __future__ import annotations

from pydantic import BaseModel


class PyramidEntry(BaseModel):
    expertise_code: str
    expertise_name: str
    track: str
    level: int
    count: int


class BranchEligibleAlert(BaseModel):
    employee_id: str
    expertise_code: str
    current_level: int
    months_stagnant: int


class StagnationAlert(BaseModel):
    employee_id: str
    score: int
    current_level: int
    months_stagnant: int


class DependencyReport(BaseModel):
    segment: str
    external_hire_ratio: float
    internal_pipeline_count: int


class PaymentRequest(BaseModel):
    amount_vnd: int
    reference: str
    status: str
    transfer_content: str
    pricing_note: str


class PaymentStatus(BaseModel):
    reference: str
    amount_vnd: int
    status: str
    paid_at: str | None = None
    consumed_at: str | None = None


class PaymentConfirmRequest(BaseModel):
    reference: str
    amount_vnd: int
    source: str = "bank_notification_companion"
