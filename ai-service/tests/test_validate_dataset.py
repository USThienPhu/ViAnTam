from validate_dataset import shortfalls_of_test_set, validate_files, validate_record


def record(**over):
    base = {
        "id": "scam_001",
        "label": "scam",
        "scam_type": "Lừa đảo đầu tư",
        "is_injection": False,
        "source": "self",
        "input": {
            "targetUsername": "x",
            "targetReportCount": 0,
            "messages": [{"sender": "target", "text": "Đầu tư lãi 30% mỗi tháng"}],
            "links": [],
            "qrTransfers": [],
        },
    }
    base.update(over)
    return base


def test_ban_ghi_hop_le_khong_co_loi():
    assert validate_record(record()) == []


def test_bat_loi_label_scam_type_va_sender():
    bad = record(label="maybe", scam_type="Không có")
    bad["input"]["messages"] = [{"sender": "admin", "text": ""}]
    errors = validate_record(bad)
    assert any("label" in e for e in errors)
    assert any("scam_type" in e for e in errors)
    assert any("sender" in e for e in errors)
    assert any("text" in e for e in errors)


def test_mau_an_toan_phai_co_scam_type_chua_xac_dinh():
    assert validate_record(record(label="safe")) != []
    assert validate_record(record(label="safe", scam_type="Chưa xác định")) == []


def test_link_va_qr_phai_co_sender():
    r = record()
    r["input"]["links"] = [{"url": "http://a.xyz", "flags": []}]
    assert any("sender" in e for e in validate_record(r))


def test_trung_id_va_trung_noi_dung_giua_dev_va_test():
    errors, _ = validate_files([record()], [record()])
    assert any("trùng id" in e for e in errors)
    assert any("trùng nội dung" in e for e in errors)


def test_bao_thieu_hut_so_luong_tap_test():
    shortfalls = shortfalls_of_test_set([record()])
    assert any(">= 60" in s for s in shortfalls)
    assert any("an toàn" in s for s in shortfalls)
    assert any("injection" in s for s in shortfalls)


def test_cli_in_duoc_tieng_viet_tren_console_khong_phai_utf8():
    import os
    import subprocess
    import sys
    from pathlib import Path

    env = {**os.environ, "PYTHONIOENCODING": "cp1252"}
    script = Path(__file__).resolve().parent.parent / "validate_dataset.py"
    result = subprocess.run([sys.executable, str(script)], env=env, capture_output=True)
    assert result.returncode == 0, result.stderr.decode("utf-8", "replace")
