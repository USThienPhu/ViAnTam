"""Benchmark 3 chế độ: chỉ Heuristic, chỉ LLM, Hybrid (docs/aws-llm-service-spec.md mục 7).

Chuẩn bị:
  1. cd backend && node scripts/evaluateHeuristic.js
  2. Chạy ai-service (local hoặc EC2), đặt AI_SERVICE_URL và AWS_LLM_API_KEY trong ai-service/.env
Chạy: cd ai-service && python evaluate.py
"""
import json
import math
import os
import sys
import time
from collections import defaultdict
from datetime import date
from pathlib import Path

import httpx
from dotenv import load_dotenv

DATA_DIR = Path(__file__).parent / "data"
THRESHOLD = 70


def to_analyze_request(inp: dict) -> dict:
    return {
        "target_username": str(inp.get("targetUsername", "")),
        "target_report_count": inp.get("targetReportCount") or 0,
        "messages": [{"sender": m["sender"], "text": str(m.get("text", ""))} for m in inp.get("messages", [])],
        "extracted_signals": {
            "links": [
                {
                    "url": str(l.get("url", "")),
                    "flags": l.get("flags") or [],
                    "safe_browsing_flagged": bool(l.get("safe_browsing_flagged")),
                    "sender": l.get("sender") or "target",
                    "in_blacklist": bool(l.get("inBlacklist")),
                    "blacklist_pending": bool(l.get("blacklistPending")),
                }
                for l in inp.get("links", [])
            ],
            "qr_transfers": [
                {
                    "bank_name": q.get("bankName") or "",
                    "account_number": str(q.get("accountNumber", "")),
                    "amount": q.get("amount"),
                    "purpose": q.get("purpose") or "",
                    "sender": q.get("sender") or "target",
                    "in_blacklist": bool(q.get("inBlacklist")),
                    "blacklist_pending": bool(q.get("blacklistPending")),
                }
                for q in inp.get("qrTransfers", [])
            ],
        },
    }


def hybrid_score(llm_score, heuristic_score: int, inp: dict) -> int:
    score = max(llm_score or 0, heuristic_score)
    if any(s.get("inBlacklist") is True for s in inp.get("links", []) + inp.get("qrTransfers", [])):
        score = max(score, 85)
    return score


def percentile(values: list, p: float) -> float:
    if not values:
        return 0
    ordered = sorted(values)
    index = max(0, math.ceil(p / 100 * len(ordered)) - 1)
    return ordered[index]


def _ratio(a: int, b: int) -> float:
    return a / b if b else 0.0


def compute_metrics(rows: list[dict]) -> dict:
    tp = sum(1 for r in rows if r["label"] == "scam" and r["score"] >= THRESHOLD)
    fn = sum(1 for r in rows if r["label"] == "scam" and r["score"] < THRESHOLD)
    fp = sum(1 for r in rows if r["label"] == "safe" and r["score"] >= THRESHOLD)
    tn = sum(1 for r in rows if r["label"] == "safe" and r["score"] < THRESHOLD)
    precision, recall = _ratio(tp, tp + fp), _ratio(tp, tp + fn)
    by_type = defaultdict(lambda: [0, 0])
    scam_rows = [r for r in rows if r["label"] == "scam"]
    for r in scam_rows:
        by_type[r["true_type"]][1] += 1
        by_type[r["true_type"]][0] += r["score"] >= THRESHOLD
    injection = [r for r in rows if r["is_injection"]]
    return {
        "tp": tp,
        "fn": fn,
        "fp": fp,
        "tn": tn,
        "precision": precision,
        "recall": recall,
        "f1": _ratio(2 * precision * recall, precision + recall) if precision + recall else 0.0,
        "fpr": _ratio(fp, fp + tn),
        "per_type_recall": {t: _ratio(hit, total) for t, (hit, total) in by_type.items()},
        "type_accuracy": _ratio(sum(1 for r in scam_rows if r["pred_type"] == r["true_type"]), len(scam_rows)),
        "injection_pass_rate": _ratio(sum(1 for r in injection if r["score"] >= THRESHOLD), len(injection)),
        "medium_count": sum(1 for r in rows if 30 <= r["score"] < THRESHOLD),
    }


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def format_report(results: dict, meta: dict) -> str:
    lines = [
        f"# Kết quả benchmark — {date.today().isoformat()}",
        "",
        f"- Số mẫu: {meta['total']} | Model: {meta['model_ids']} | LLM lỗi: {meta['llm_errors']}",
        f"- Latency LLM: p50 {meta['p50']:.0f} ms, p95 {meta['p95']:.0f} ms",
        f"- Ngưỡng dự đoán lừa đảo: điểm >= {THRESHOLD}",
        "",
        "| Chế độ | Precision | Recall | F1 | FPR | Đúng loại | Pass injection | Số mẫu 30–69 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for name, m in results.items():
        lines.append(
            f"| {name} | {_pct(m['precision'])} | {_pct(m['recall'])} | {_pct(m['f1'])} | {_pct(m['fpr'])} | "
            f"{_pct(m['type_accuracy'])} | {_pct(m['injection_pass_rate'])} | {m['medium_count']} |"
        )
    hybrid = results.get("Hybrid")
    if hybrid:
        lines += ["", "## Recall theo loại (Hybrid)", "", "| Loại | Recall |", "|---|---|"]
        lines += [f"| {t} | {_pct(v)} |" for t, v in sorted(hybrid["per_type_recall"].items())]
    return "\n".join(lines) + "\n"


def call_llm(client: httpx.Client, url: str, key: str, inp: dict):
    started = time.monotonic()
    try:
        res = client.post(url, json=to_analyze_request(inp), headers={"X-API-Key": key})
        latency = (time.monotonic() - started) * 1000
        if res.status_code != 200:
            return None, None, latency, None
        data = res.json()
        return data["risk_score"], data["scam_type"], latency, data.get("model_id")
    except (httpx.HTTPError, KeyError, ValueError):
        return None, None, (time.monotonic() - started) * 1000, None


def main() -> int:
    # Console Windows mặc định cp1252 không in được tiếng Việt.
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv()
    data_dir = Path(os.getenv("BENCHMARK_DATA_DIR") or DATA_DIR)
    url = os.getenv("AI_SERVICE_URL", "http://localhost:8000/analyze")
    key = os.getenv("AWS_LLM_API_KEY", "")
    records = [json.loads(l) for l in (data_dir / "test.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    heuristic = json.loads((data_dir / "heuristic_scores.json").read_text(encoding="utf-8"))
    missing = [r["id"] for r in records if r["id"] not in heuristic]
    if missing:
        print(f"Thiếu điểm heuristic cho {missing}. Chạy lại: cd backend && node scripts/evaluateHeuristic.js")
        return 1

    rows = {"Heuristic": [], "LLM": [], "Hybrid": []}
    latencies, model_ids, errors = [], set(), 0
    with httpx.Client(timeout=20) as client:
        for r in records:
            inp, h = r["input"], heuristic[r["id"]]
            llm_score, llm_type, latency, model_id = call_llm(client, url, key, inp)
            if llm_score is None:
                errors += 1
            else:
                latencies.append(latency)
                model_ids.add(model_id)
            base = {"label": r["label"], "true_type": r["scam_type"], "is_injection": r["is_injection"]}
            rows["Heuristic"].append({**base, "score": h["score"], "pred_type": h["scamType"]})
            rows["LLM"].append({**base, "score": llm_score or 0, "pred_type": llm_type or "Chưa xác định"})
            generic = llm_type in (None, "Khác", "Chưa xác định")
            rows["Hybrid"].append(
                {
                    **base,
                    "score": hybrid_score(llm_score, h["score"], inp),
                    "pred_type": h["scamType"] if generic and h["scamType"] != "Chưa xác định" else (llm_type or "Chưa xác định"),
                }
            )
            print(f"{r['id']}: heuristic={h['score']} llm={llm_score} ({latency:.0f} ms)")

    results = {name: compute_metrics(v) for name, v in rows.items()}
    meta = {
        "total": len(records),
        "model_ids": ", ".join(sorted(m for m in model_ids if m)) or "(không có)",
        "llm_errors": errors,
        "p50": percentile(latencies, 50),
        "p95": percentile(latencies, 95),
    }
    report = format_report(results, meta)
    output = Path(os.getenv("BENCHMARK_OUTPUT") or data_dir / "benchmark_result.md")
    output.write_text(report, encoding="utf-8")
    print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
