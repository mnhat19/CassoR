"""Payment API for Talent Radar paid analysis feature.

Flow:
  1. POST /initiate        — upload HR file, get payment info
  2. GET  /status/{ref}    — poll payment status
  3. POST /webhook/confirm — APK confirms payment received
  4. POST /analyze/{ref}   — download Excel report (consumes the payment)
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
import io
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.config import settings
from app.database import get_session
from app.models.employee import PaymentAttempt
from app.schemas.payment import (
    BankInfo,
    PaymentInitiateResponse,
    PaymentStatusResponse,
    WebhookConfirmRequest,
)
from app.services.file_store import delete_file, get_file, store_file
from app.services.radar_upload import parse_hr_file, run_radar_analysis
from app.services.report_generator import generate_excel_report

router = APIRouter(tags=["Payment"])

_ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}
_MAX_FILE_SIZE_MB = 10


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_reference() -> str:
    """Generate a unique, bank-friendly reference code: CSR + 8 uppercase alphanumeric."""
    chars = secrets.token_hex(4).upper()  # 8 hex chars
    return f"CSR{chars}"


def _validate_file_extension(filename: str) -> str:
    lower = filename.lower()
    for ext in _ALLOWED_EXTENSIONS:
        if lower.endswith(ext):
            return ext
    raise HTTPException(
        status_code=400,
        detail=f"Định dạng file không hỗ trợ. Chấp nhận: {', '.join(_ALLOWED_EXTENSIONS)}",
    )


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> PaymentInitiateResponse:
    """Upload HR file and create a payment request. Returns bank transfer info."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên file không hợp lệ")

    _validate_file_extension(file.filename)

    content = await file.read()
    if len(content) > _MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File vượt quá giới hạn {_MAX_FILE_SIZE_MB}MB",
        )

    # Quick validation: try parsing the file
    try:
        employees = parse_hr_file(content, file.filename)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Không thể đọc file: {exc}. Vui lòng kiểm tra định dạng cột.",
        ) from exc

    if not employees:
        raise HTTPException(
            status_code=422,
            detail="File không có dữ liệu nhân sự hợp lệ (cần cột Chức danh/Title).",
        )

    reference = _generate_reference()

    # Store file in memory
    store_file(reference, file.filename, content)

    # Persist payment attempt
    attempt = PaymentAttempt(
        reference=reference,
        amount_vnd=settings.payment_amount_vnd,
        status="pending",
        user_id=None,
        created_at=_now_iso(),
        source="upload",
        original_filename=file.filename,
    )
    session.add(attempt)
    await session.commit()

    expires_min = settings.payment_file_expiry_seconds // 60
    return PaymentInitiateResponse(
        reference=reference,
        amount_vnd=settings.payment_amount_vnd,
        bank_info=BankInfo(
            bank_name=settings.payment_bank_name,
            account_number=settings.payment_bank_account,
            account_name=settings.payment_bank_account_name,
            amount_vnd=settings.payment_amount_vnd,
            transfer_content=reference,
        ),
        expires_in_minutes=expires_min,
    )


@router.get("/status/{reference}", response_model=PaymentStatusResponse)
async def get_payment_status(
    reference: str,
    session: AsyncSession = Depends(get_session),
) -> PaymentStatusResponse:
    """Poll payment status for a given reference code."""
    result = await session.execute(
        select(PaymentAttempt).where(PaymentAttempt.reference == reference)
    )
    attempt = result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="Mã thanh toán không tồn tại")

    # Check if file still in memory (not expired)
    if attempt.status == "pending" and get_file(reference) is None:
        attempt.status = "expired"
        await session.commit()

    return PaymentStatusResponse(
        reference=reference,
        status=attempt.status,
        original_filename=attempt.original_filename,
    )


@router.post("/webhook/confirm")
async def webhook_confirm(
    req: WebhookConfirmRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Called by Android APK when it detects a bank payment notification."""
    if req.secret != settings.payment_webhook_secret:
        raise HTTPException(status_code=403, detail="Unauthorized webhook call")

    result = await session.execute(
        select(PaymentAttempt).where(PaymentAttempt.reference == req.reference)
    )
    attempt = result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="Mã thanh toán không tồn tại")

    if attempt.status == "consumed":
        return {"ok": True, "message": "Đã phân tích trước đó"}

    if attempt.status == "paid":
        return {"ok": True, "message": "Đã xác nhận trước đó"}

    if attempt.amount_vnd > 0 and req.amount_vnd < attempt.amount_vnd:
        raise HTTPException(
            status_code=400,
            detail=f"Số tiền không đủ: nhận {req.amount_vnd}đ, yêu cầu {attempt.amount_vnd}đ",
        )

    attempt.status = "paid"
    attempt.paid_at = _now_iso()
    attempt.source = req.source
    await session.commit()

    return {"ok": True, "message": f"Xác nhận thanh toán {req.reference} thành công"}


@router.post("/analyze/{reference}")
async def analyze_and_download(
    reference: str,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Run Talent Radar analysis and return Excel report. Consumes the payment (one-time use)."""
    result = await session.execute(
        select(PaymentAttempt).where(PaymentAttempt.reference == reference)
    )
    attempt = result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="Mã thanh toán không tồn tại")

    if attempt.status == "consumed":
        raise HTTPException(
            status_code=410,
            detail="Lượt phân tích này đã được sử dụng. Vui lòng tạo lượt mới.",
        )

    if attempt.status != "paid":
        raise HTTPException(
            status_code=402,
            detail="Thanh toán chưa được xác nhận. Vui lòng chờ xác nhận.",
        )

    file_entry = get_file(reference)
    if not file_entry:
        raise HTTPException(
            status_code=410,
            detail="File đã hết hạn (30 phút). Vui lòng tạo lượt phân tích mới.",
        )

    try:
        employees = parse_hr_file(file_entry["content"], file_entry["filename"])
        analysis = await run_radar_analysis(employees, session)
        report_bytes = generate_excel_report(analysis)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi tạo báo cáo: {exc}",
        ) from exc

    # Mark as consumed — no re-download
    attempt.status = "consumed"
    attempt.consumed_at = _now_iso()
    await session.commit()

    # Clean up file from memory
    delete_file(reference)

    filename = f"talent_radar_{reference}.xlsx"
    return StreamingResponse(
        io.BytesIO(report_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
