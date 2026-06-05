from pydantic import BaseModel


class BankInfo(BaseModel):
    bank_name: str
    account_number: str
    account_name: str
    amount_vnd: int
    transfer_content: str


class PaymentInitiateResponse(BaseModel):
    reference: str
    amount_vnd: int
    bank_info: BankInfo
    expires_in_minutes: int
    status: str = "pending"


class PaymentStatusResponse(BaseModel):
    reference: str
    status: str  # pending | paid | consumed | expired
    original_filename: str | None = None


class WebhookConfirmRequest(BaseModel):
    reference: str
    amount_vnd: int
    source: str = "bank_notification"
    secret: str
