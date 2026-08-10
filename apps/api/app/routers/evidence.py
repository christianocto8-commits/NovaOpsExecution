from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.ai_evidence_auditor import audit_evidence_url

router = APIRouter(prefix="/evidence", tags=["Evidence AI Audit"])


class EvidenceAuditRequest(BaseModel):
    evidence_url: str = Field(..., description="URL of photo evidence to audit")
    context_note: str | None = Field(default=None, description="Optional note attached to execution")


class EvidenceAuditResponse(BaseModel):
    status: str
    confidence_score: int
    reasons: list[str]
    tags: list[str]
    audited_at: str


@router.post("/audit", response_model=EvidenceAuditResponse)
def audit_photo_evidence(
    payload: EvidenceAuditRequest,
    current_user=Depends(get_current_user),
):
    """Run AI photo verification on uploaded evidence image."""
    result = audit_evidence_url(payload.evidence_url, payload.context_note)
    return EvidenceAuditResponse(**result.to_dict())
