from app.services.ai_evidence_auditor import audit_evidence_url


def test_audit_evidence_valid_photo():
    result = audit_evidence_url("/uploads/evidence/task_photo_123.jpg", "Semua peralatan bersih dan siap digunakan.")
    assert result.status == "passed"
    assert result.confidence_score >= 80
    assert "valid_format" in result.tags
    assert "detailed_note" in result.tags


def test_audit_evidence_missing_photo():
    result = audit_evidence_url(None)
    assert result.status == "flagged"
    assert result.confidence_score == 0
    assert "missing" in result.tags


def test_audit_evidence_placeholder_image():
    result = audit_evidence_url("/uploads/evidence/test_placeholder_blank.png")
    assert result.status in {"review_needed", "flagged"}
    assert "suspected_placeholder" in result.tags
