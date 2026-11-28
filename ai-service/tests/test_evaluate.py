from evaluate import compute_metrics, format_report, hybrid_score, percentile, to_analyze_request


def row(label, score, true_type="Lừa đảo đầu tư", pred_type="Lừa đảo đầu tư", inj=False):
    return {"label": label, "score": score, "true_type": true_type, "pred_type": pred_type, "is_injection": inj}


def test_compute_metrics():
    rows = [
        row("scam", 90),
        row("scam", 75, pred_type="Khác"),
        row("scam", 50, true_type="Lừa đảo tình cảm", pred_type="Lừa đảo tình cảm", inj=True),
        row("safe", 80, true_type="Chưa xác định"),
        row("safe", 10, true_type="Chưa xác định"),
    ]
    m = compute_metrics(rows)
    assert m["tp"] == 2 and m["fn"] == 1 and m["fp"] == 1 and m["tn"] == 1
    assert round(m["precision"], 3) == 0.667
    assert round(m["recall"], 3) == 0.667
    assert round(m["f1"], 3) == 0.667
    assert m["fpr"] == 0.5
    assert m["per_type_recall"] == {"Lừa đảo đầu tư": 1.0, "Lừa đảo tình cảm": 0.0}
    assert round(m["type_accuracy"], 3) == 0.667
    assert m["injection_pass_rate"] == 0.0
    assert m["medium_count"] == 1


def test_compute_metrics_khong_chia_cho_0():
    m = compute_metrics([])
    assert m["precision"] == 0.0 and m["recall"] == 0.0 and m["fpr"] == 0.0


def test_hybrid_score_lay_max_va_san_blacklist():
    inp = {"links": [], "qrTransfers": []}
    assert hybrid_score(20, 40, inp) == 40
    assert hybrid_score(None, 15, inp) == 15
    inp_bl = {"links": [{"inBlacklist": True}], "qrTransfers": []}
    assert hybrid_score(10, 0, inp_bl) == 85
    inp_user = {"links": [{"inBlacklist": True, "sender": "user"}], "qrTransfers": []}
    assert hybrid_score(10, 0, inp_user) == 10
    inp_pending = {"links": [{"blacklistPending": True}], "qrTransfers": []}
    assert hybrid_score(10, 0, inp_pending) == 10


def test_percentile_nearest_rank():
    assert percentile([], 50) == 0
    assert percentile([5, 1, 3], 50) == 3
    assert percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95) == 10


def test_to_analyze_request():
    req = to_analyze_request(
        {
            "targetUsername": "x",
            "messages": [{"sender": "target", "text": "hi"}],
            "links": [{"url": "u", "sender": "user", "inBlacklist": True}],
            "qrTransfers": [{"accountNumber": 1}],
        }
    )
    assert req["target_report_count"] == 0
    assert req["extracted_signals"]["links"][0] == {
        "url": "u", "flags": [], "safe_browsing_flagged": False, "sender": "user", "in_blacklist": True, "blacklist_pending": False,
    }
    assert req["extracted_signals"]["qr_transfers"][0]["account_number"] == "1"
    assert req["extracted_signals"]["qr_transfers"][0]["sender"] == "target"


def test_format_report_co_ca_3_che_do():
    m = compute_metrics([row("scam", 90)])
    text = format_report({"Heuristic": m, "LLM": m, "Hybrid": m}, {"model_ids": "m", "llm_errors": 0, "p50": 1, "p95": 2, "total": 1})
    for name in ("Heuristic", "LLM", "Hybrid", "Recall", "p95"):
        assert name in text


def test_cli_in_duoc_tieng_viet_va_ghi_ket_qua_vao_duong_dan_chi_dinh(tmp_path):
    import os
    import subprocess
    import sys
    from pathlib import Path

    import json

    root = Path(__file__).resolve().parent.parent
    sample = {
        "id": "s1", "label": "scam", "scam_type": "Lừa đảo đầu tư", "is_injection": False, "source": "self",
        "input": {"targetUsername": "x", "targetReportCount": 0, "messages": [{"sender": "target", "text": "đầu tư"}],
                  "links": [], "qrTransfers": []},
    }
    (tmp_path / "test.jsonl").write_text(json.dumps(sample, ensure_ascii=False) + "\n", encoding="utf-8")
    (tmp_path / "heuristic_scores.json").write_text(json.dumps({"s1": {"score": 30, "scamType": "Lừa đảo đầu tư"}}), encoding="utf-8")
    out = tmp_path / "result.md"
    env = {
        **os.environ,
        "PYTHONIOENCODING": "cp1252",
        "AI_SERVICE_URL": "http://127.0.0.1:9/analyze",
        "BENCHMARK_DATA_DIR": str(tmp_path),
        "BENCHMARK_OUTPUT": str(out),
    }
    result = subprocess.run([sys.executable, str(root / "evaluate.py")], env=env, capture_output=True, cwd=root)
    assert result.returncode == 0, result.stderr.decode("utf-8", "replace")
    assert "Hybrid" in out.read_text(encoding="utf-8")
