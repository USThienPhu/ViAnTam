import pytest
from botocore.exceptions import ClientError

import model_loader


def throttle(*_args):
    raise ClientError({"Error": {"Code": "ThrottlingException", "Message": "slow down"}}, "Converse")


def test_dung_model_chinh_khi_thanh_cong(monkeypatch):
    monkeypatch.setenv("BEDROCK_MODEL_ID", "main")
    monkeypatch.setenv("BEDROCK_FALLBACK_MODEL_ID", "backup")
    calls = []
    monkeypatch.setattr(model_loader, "_converse", lambda m, s, u: calls.append(m) or '{"ok": 1}')
    assert model_loader.generate("sys", "user") == ('{"ok": 1}', "main")
    assert calls == ["main"]


def test_chuyen_sang_model_du_phong_khi_model_chinh_loi(monkeypatch):
    monkeypatch.setenv("BEDROCK_MODEL_ID", "main")
    monkeypatch.setenv("BEDROCK_FALLBACK_MODEL_ID", "backup")

    def fake(model_id, _s, _u):
        if model_id == "main":
            throttle()
        return "text"

    monkeypatch.setattr(model_loader, "_converse", fake)
    assert model_loader.generate("sys", "user") == ("text", "backup")


def test_moi_model_loi_thi_nem_llm_unavailable(monkeypatch):
    monkeypatch.setenv("BEDROCK_MODEL_ID", "main")
    monkeypatch.delenv("BEDROCK_FALLBACK_MODEL_ID", raising=False)
    monkeypatch.setattr(model_loader, "_converse", throttle)
    with pytest.raises(model_loader.LLMUnavailable):
        model_loader.generate("sys", "user")


def test_chua_cau_hinh_model_thi_nem_llm_unavailable(monkeypatch):
    monkeypatch.delenv("BEDROCK_MODEL_ID", raising=False)
    monkeypatch.delenv("BEDROCK_FALLBACK_MODEL_ID", raising=False)
    with pytest.raises(model_loader.LLMUnavailable):
        model_loader.generate("sys", "user")


def test_client_chi_goi_mot_lan_khong_tu_retry(monkeypatch):
    captured = {}
    monkeypatch.setattr(model_loader, "_client", None)
    monkeypatch.setattr(model_loader.boto3, "client", lambda *a, **k: captured.update(k) or object())
    model_loader._get_client()
    assert captured["config"].retries == {"mode": "standard", "max_attempts": 1}


def test_bo_qua_model_du_phong_khi_da_qua_han(monkeypatch):
    monkeypatch.setenv("BEDROCK_MODEL_ID", "main")
    monkeypatch.setenv("BEDROCK_FALLBACK_MODEL_ID", "backup")
    clock = {"t": 0.0}
    calls = []
    monkeypatch.setattr(model_loader, "_now", lambda: clock["t"])

    def slow_fail(model_id, _s, _u):
        calls.append(model_id)
        clock["t"] += 7.0
        throttle()

    monkeypatch.setattr(model_loader, "_converse", slow_fail)
    with pytest.raises(model_loader.LLMUnavailable):
        model_loader.generate("sys", "user", deadline=6.0)
    assert calls == ["main"]
