"""Pydantic schemas cho ai-service (docs/aws-llm-service-spec.md mục 2)."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

# Giữ khớp với backend/src/config/scamTypes.js
SCAM_TYPES = [
    "Giả danh ngân hàng / ví điện tử",
    "Giả danh cơ quan chức năng",
    "Đánh cắp mã OTP / tài khoản",
    "Lừa đảo tuyển cộng tác viên / việc làm",
    "Lừa đảo đầu tư",
    "Link giả mạo (phishing)",
    "Lừa cài ứng dụng điều khiển từ xa",
    "Lừa đảo tình cảm",
    "Khác",
    "Chưa xác định",
]

Sender = Literal["user", "target"]


class ChatMessage(BaseModel):
    sender: Sender
    text: str


class LinkSignal(BaseModel):
    url: str
    flags: list[str] = []
    safe_browsing_flagged: bool = False
    sender: Sender = "target"
    in_blacklist: bool = False
    blacklist_pending: bool = False


class QRSignal(BaseModel):
    bank_name: str = ""
    account_number: str
    amount: Optional[float] = None
    purpose: Optional[str] = ""
    sender: Sender = "target"
    in_blacklist: bool = False
    blacklist_pending: bool = False


class ExtractedSignals(BaseModel):
    links: list[LinkSignal] = []
    qr_transfers: list[QRSignal] = []


class AnalyzeRequest(BaseModel):
    target_username: str
    target_report_count: int = 0
    messages: list[ChatMessage]
    extracted_signals: ExtractedSignals


class SuspiciousSign(BaseModel):
    quote: str
    explanation: str


class AnalyzeResponse(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    risk_level: Literal["low", "medium", "high"]
    scam_type: str
    suspicious_signs: list[SuspiciousSign] = []
    advice: list[str] = []


class AnalyzeResult(AnalyzeResponse):
    model_id: str
