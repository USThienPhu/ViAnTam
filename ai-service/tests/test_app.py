import json
import logging

import pytest
from fastapi.testclient import TestClient

import app as app_module
import model_loader

SECRET_TEXT = "Vui lòng chuyển 500.000đ vào STK 123456789 để xác minh"
BODY = {
    "target_username": "HoTro_MoMo_247",
    "target_report_count": 4,
    "messages": [{"sender": "target", "text": SECRET_TEXT}],
    "extracted_signals": {"links": [], "qr_transfers": []},
}
VALID = {
    "risk_score": 88,
    "risk_level": "high",
    "scam_type": "Giả danh ngân hàng / ví điện tử",
    "suspicious_signs": [
        {"quote": "chuyển 500.000đ vào STK", "explanation": "Yêu cầu chuyển tiền."},
        {"quote": "câu bịa không có trong hội thoại", "explanation": "x"},
    ],
    "advice": ["Không chuyển tiền."],
}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("AWS_LLM_API_KEY", "secret")
    return TestClient(app_module.app)


def fake_generate(monkeypatch, replies):
    prompts = []

    def fake(system_prompt, user_prompt):
        prompts.append(user_prompt)
        reply = replies[len(prompts) - 1]
        if isinstance(reply, Exception):
            raise reply
        return reply, "model-main"

    monkeypatch.setattr(model_loader, "generate", fake)
    return prompts


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_sai_hoac_thieu_api_key_tra_401(client, monkeypatch):
    fake_generate(monkeypatch, [json.dumps(VALID)])
    assert client.post("/analyze", json=BODY).status_code == 401
    assert client.post("/analyze", json=BODY, headers={"X-API-Key": "sai"}).status_code == 401


def test_thanh_cong_loai_trich_dan_bia_va_gan_model_id(client, monkeypatch):
    fake_generate(monkeypatch, [json.dumps(VALID)])
    res = client.post("/analyze", json=BODY, headers={"X-API-Key": "secret"})
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] == 88
    assert data["model_id"] == "model-main"
    assert [s["quote"] for s in data["suspicious_signs"]] == ["chuyển 500.000đ vào STK"]


def test_scam_type_la_doi_thanh_khac_va_sua_json_co_fence(client, monkeypatch):
    raw = "```json\n" + json.dumps({**VALID, "scam_type": "Loại lạ"}) + "\n```"
    fake_generate(monkeypatch, [raw])
    data = client.post("/analyze", json=BODY, headers={"X-API-Key": "secret"}).json()
    assert data["scam_type"] == "Khác"


def test_json_loi_lan_dau_thi_retry_voi_cau_nhac(client, monkeypatch):
    prompts = fake_generate(monkeypatch, ["không phải json", json.dumps(VALID)])
    res = client.post("/analyze", json=BODY, headers={"X-API-Key": "secret"})
    assert res.status_code == 200
    assert len(prompts) == 2
    assert prompts[1].endswith(app_module.RETRY_SUFFIX)


def test_json_loi_hai_lan_tra_502(client, monkeypatch):
    fake_generate(monkeypatch, ["{sai", json.dumps({**VALID, "risk_score": 150})])
    res = client.post("/analyze", json=BODY, headers={"X-API-Key": "secret"})
    assert res.status_code == 502
    assert res.json() == {"detail": "LLM_UNAVAILABLE"}


def test_bedrock_loi_tra_502(client, monkeypatch):
    fake_generate(monkeypatch, [model_loader.LLMUnavailable("ThrottlingException")])
    res = client.post("/analyze", json=BODY, headers={"X-API-Key": "secret"})
    assert res.status_code == 502


def test_log_khong_chua_noi_dung_tin_nhan(client, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    fake_generate(monkeypatch, ["{sai", json.dumps(VALID)])
    client.post("/analyze", json=BODY, headers={"X-API-Key": "secret"})
    fake_generate(monkeypatch, [model_loader.LLMUnavailable("x")])
    client.post("/analyze", json=BODY, headers={"X-API-Key": "secret"})
    assert caplog.records, "phải có log vận hành"
    assert "123456789" not in caplog.text
    assert "chuyển 500.000đ" not in caplog.text
