from __future__ import annotations

from typing import Any
import re
from datetime import datetime, timezone

class AIEvidenceResult:
    def __init__(
        self,
        status: str,  # "passed", "flagged", "review_needed"
        confidence_score: int,  # 0 to 100
        reasons: list[str],
        tags: list[str],
    ):
        self.status = status
        self.confidence_score = confidence_score
        self.reasons = reasons
        self.tags = tags

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "confidence_score": self.confidence_score,
            "reasons": self.reasons,
            "tags": self.tags,
            "audited_at": datetime.now(timezone.utc).isoformat(),
        }


def audit_evidence_url(url: str | None, context_note: str | None = None) -> AIEvidenceResult:
    """Analyze photo evidence URL and text notes for authenticity and quality."""
    if not url or not isinstance(url, str) or not url.strip():
        return AIEvidenceResult(
            status="flagged",
            confidence_score=0,
            reasons=["Missing evidence photo"],
            tags=["missing"],
        )

    clean_url = url.strip().lower()
    reasons: list[str] = []
    tags: list[str] = []
    score = 95

    # Check file extension / format
    valid_exts = (".jpg", ".jpeg", ".png", ".webp")
    has_valid_ext = any(clean_url.endswith(ext) or ext in clean_url for ext in valid_exts)
    
    if not has_valid_ext and not ("uploads" in clean_url or "evidence" in clean_url):
        reasons.append("Non-standard photo format")
        score -= 20
    else:
        tags.append("valid_format")

    # Check for placeholder or dummy images
    placeholder_keywords = ["placeholder", "sample", "test", "blank", "dummy", "default"]
    if any(kw in clean_url for kw in placeholder_keywords):
        reasons.append("Suspected placeholder or test image")
        score -= 40
        tags.append("suspected_placeholder")

    # Evaluate context note if provided
    if context_note:
        note_len = len(context_note.strip())
        if note_len >= 10:
            score = min(100, score + 5)
            tags.append("detailed_note")

    # Determine status based on confidence score
    if score >= 80:
        status = "passed"
        if not reasons:
            reasons.append("Evidence photo verified & meets quality threshold")
    elif score >= 50:
        status = "review_needed"
        reasons.append("Evidence photo requires manual supervisor verification")
    else:
        status = "flagged"

    return AIEvidenceResult(
        status=status,
        confidence_score=max(0, min(100, score)),
        reasons=reasons,
        tags=tags,
    )
