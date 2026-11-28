"""FastAPI wrapper gọi Bedrock (docs/aws-llm-service-spec.md mục 4)."""
import json
import logging
import os
import re
import time
import uuid
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import ValidationError

load_dotenv()

import model_loader  # noqa: E402
import prompt_builder  # noqa: E402
from schemas import SCAM_TYPES, AnalyzeRequest, AnalyzeResponse, AnalyzeResult  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ai-service")
app = FastAPI(title="AegisAI AI Service")

# Backend chờ tối đa 15s; quá 6s thì không thử lại nữa để tổng thời gian < 12s.
RETRY_CUTOFF_S = 6.0
_now = time.monotonic
RETRY_SUFFIX = "\n\nChỉ trả về đúng một object JSON theo schema, không kèm giải thích."
FENCE_RE = re.compile(r"```(?:json)?", re.IGNORECASE)


def repair_json(raw: str) -> AnalyzeResponse:
    text = FENCE_RE.sub("", raw or "")
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("không tìm thấy object JSON")
    return AnalyzeResponse(**json.loads(text[start : end + 1]))


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def postprocess(resp: AnalyzeResponse, texts: list[str], model_id: str) -> AnalyzeResult:
    corpus = [_normalize(t) for t in texts]
    signs = [
        s for s in resp.suspicious_signs if _normalize(s.quote) and any(_normalize(s.quote) in c for c in corpus)
    ]
    scam_type = resp.scam_type if resp.scam_type in SCAM_TYPES else "Khác"
    base = resp.model_dump(exclude={"suspicious_signs", "scam_type"})
    return AnalyzeResult(**base, suspicious_signs=signs, scam_type=scam_type, model_id=model_id)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResult)
def analyze(req: AnalyzeRequest, x_api_key: Optional[str] = Header(default=None)):
    expected = os.getenv("AWS_LLM_API_KEY", "")
    if not expected or x_api_key != expected:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")

    request_id = uuid.uuid4().hex[:8]
    started = _now()
    deadline = started + RETRY_CUTOFF_S
    user_prompt = prompt_builder.build_user_prompt(req)
    texts = prompt_builder.conversation_texts(req)

    for attempt in (1, 2):
        if attempt == 2 and _now() >= deadline:
            logger.warning("rid=%s skip_retry over_budget", request_id)
            break
        prompt = user_prompt if attempt == 1 else user_prompt + RETRY_SUFFIX
        try:
            raw, model_id = model_loader.generate(prompt_builder.SYSTEM_PROMPT, prompt, deadline=deadline)
        except model_loader.LLMUnavailable as err:
            logger.warning("rid=%s llm_unavailable error=%s", request_id, err)
            raise HTTPException(status_code=502, detail="LLM_UNAVAILABLE")
        try:
            result = postprocess(repair_json(raw), texts, model_id)
        except (ValueError, ValidationError) as err:
            logger.warning("rid=%s invalid_json attempt=%d error=%s", request_id, attempt, type(err).__name__)
            continue
        logger.info(
            "rid=%s ok model=%s messages=%d prompt_chars=%d latency_ms=%d",
            request_id,
            model_id,
            len(req.messages),
            len(prompt),
            int((_now() - started) * 1000),
        )
        return result

    raise HTTPException(status_code=502, detail="LLM_UNAVAILABLE")
