"""Kiểm tra định dạng dev.jsonl / test.jsonl (docs/aws-llm-service-spec.md mục 7)."""
import json
import sys
from collections import Counter
from pathlib import Path

from schemas import SCAM_TYPES

DATA_DIR = Path(__file__).parent / "data"
COUNTED_TYPES = [t for t in SCAM_TYPES if t not in ("Khác", "Chưa xác định")]
SENDERS = ("user", "target")


def load_jsonl(path: Path) -> list[dict]:
    records = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError as err:
            raise ValueError(f"{path.name}:{line_no}: JSON hỏng ({err.msg})") from err
    return records


def validate_record(r: dict) -> list[str]:
    rid = r.get("id") or "<thiếu id>"
    errors = []
    if not isinstance(r.get("id"), str) or not r["id"]:
        errors.append(f"{rid}: thiếu id")
    if r.get("label") not in ("scam", "safe"):
        errors.append(f"{rid}: label phải là 'scam' hoặc 'safe'")
    if r.get("scam_type") not in SCAM_TYPES:
        errors.append(f"{rid}: scam_type không thuộc SCAM_TYPES")
    if r.get("label") == "safe" and r.get("scam_type") != "Chưa xác định":
        errors.append(f"{rid}: mẫu an toàn phải có scam_type 'Chưa xác định'")
    if not isinstance(r.get("is_injection"), bool):
        errors.append(f"{rid}: is_injection phải là true/false")
    if not isinstance(r.get("source"), str) or not r["source"]:
        errors.append(f"{rid}: thiếu source")

    inp = r.get("input")
    if not isinstance(inp, dict):
        return errors + [f"{rid}: thiếu input"]
    if not isinstance(inp.get("targetUsername"), str):
        errors.append(f"{rid}: input.targetUsername phải là chuỗi")
    if not isinstance(inp.get("targetReportCount"), int) or inp["targetReportCount"] < 0:
        errors.append(f"{rid}: input.targetReportCount phải là số nguyên >= 0")
    messages = inp.get("messages")
    if not isinstance(messages, list) or not messages:
        errors.append(f"{rid}: input.messages phải là mảng không rỗng")
    else:
        for i, m in enumerate(messages):
            if m.get("sender") not in SENDERS:
                errors.append(f"{rid}: messages[{i}].sender phải là 'user' hoặc 'target'")
            if not isinstance(m.get("text"), str) or not m["text"].strip():
                errors.append(f"{rid}: messages[{i}].text rỗng")
    for key in ("links", "qrTransfers"):
        items = inp.get(key)
        if not isinstance(items, list):
            errors.append(f"{rid}: input.{key} phải là mảng")
            continue
        for i, s in enumerate(items):
            if s.get("sender") not in SENDERS:
                errors.append(f"{rid}: {key}[{i}].sender phải là 'user' hoặc 'target'")
    return errors


def shortfalls_of_test_set(records: list[dict]) -> list[str]:
    scam = [r for r in records if r.get("label") == "scam"]
    safe = [r for r in records if r.get("label") == "safe"]
    injection = [r for r in records if r.get("is_injection") is True]
    out = []
    if len(records) < 60:
        out.append(f"tập test cần >= 60 mẫu (hiện {len(records)})")
    if len(scam) < 30:
        out.append(f"cần >= 30 mẫu lừa đảo (hiện {len(scam)})")
    if len(safe) < 20:
        out.append(f"cần >= 20 mẫu an toàn (hiện {len(safe)})")
    if len(injection) < 10:
        out.append(f"cần >= 10 ca injection (hiện {len(injection)})")
    per_type = Counter(r.get("scam_type") for r in scam)
    for t in COUNTED_TYPES:
        if per_type[t] < 3:
            out.append(f"loại '{t}' cần >= 3 mẫu (hiện {per_type[t]})")
    return out


def _first_text(r: dict) -> str:
    try:
        return r["input"]["messages"][0]["text"].strip().lower()
    except (KeyError, IndexError, TypeError, AttributeError):
        return ""


def validate_files(dev: list[dict], test: list[dict]) -> tuple[list[str], list[str]]:
    errors = [e for r in dev + test for e in validate_record(r)]
    ids = Counter(r.get("id") for r in dev + test)
    errors += [f"trùng id: {i}" for i, n in ids.items() if n > 1]
    dev_texts = {_first_text(r) for r in dev} - {""}
    errors += [f"{r.get('id')}: trùng nội dung tin đầu với tập dev" for r in test if _first_text(r) in dev_texts]
    return errors, shortfalls_of_test_set(test)


def main() -> int:
    # Console Windows mặc định cp1252 không in được tiếng Việt.
    sys.stdout.reconfigure(encoding="utf-8")
    dev = load_jsonl(DATA_DIR / "dev.jsonl")
    test = load_jsonl(DATA_DIR / "test.jsonl")
    errors, shortfalls = validate_files(dev, test)
    for e in errors:
        print(f"LỖI  {e}")
    for s in shortfalls:
        print(f"THIẾU {s}")
    print(f"dev: {len(dev)} mẫu, test: {len(test)} mẫu, lỗi: {len(errors)}, thiếu: {len(shortfalls)}")
    if errors or ("--strict" in sys.argv and shortfalls):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
