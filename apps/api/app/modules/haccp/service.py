from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.haccp.models import HaccpLogEntry
from app.modules.haccp.schemas import (
    HACCP_DEFAULT_RANGES,
    HaccpLogCreate,
    HaccpLogSummary,
    HaccpLogUpdate,
)
from app.modules.incidents.service import accessible_outlet_ids


def _ensure_outlet_access(db: Session, user, outlet_id: UUID) -> None:
    allowed = accessible_outlet_ids(db, user)
    if allowed is not None and outlet_id not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Outlet is outside your scope",
        )


def _evaluate_passed(
    reading_value: float,
    target_min: float | None,
    target_max: float | None,
) -> bool:
    if target_min is not None and reading_value < target_min:
        return False
    if target_max is not None and reading_value > target_max:
        return False
    return True


class HaccpLogService:
    def __init__(self, db: Session):
        self.db = db

    def list(
        self,
        user,
        *,
        outlet_id: UUID | None = None,
        ccp_name: str | None = None,
        passed: bool | None = None,
        limit: int = 200,
    ) -> list[HaccpLogEntry]:
        statement = select(HaccpLogEntry)
        allowed = accessible_outlet_ids(self.db, user)
        if allowed is not None:
            if not allowed:
                return []
            statement = statement.where(HaccpLogEntry.outlet_id.in_(allowed))
        if outlet_id:
            _ensure_outlet_access(self.db, user, outlet_id)
            statement = statement.where(HaccpLogEntry.outlet_id == outlet_id)
        if ccp_name:
            statement = statement.where(HaccpLogEntry.ccp_name == ccp_name.strip().lower())
        if passed is not None:
            statement = statement.where(HaccpLogEntry.passed == passed)
        return list(
            self.db.scalars(
                statement.order_by(HaccpLogEntry.recorded_at.desc()).limit(min(max(limit, 1), 500))
            ).all()
        )

    def get(self, user, entry_id: UUID) -> HaccpLogEntry:
        entry = self.db.get(HaccpLogEntry, entry_id)
        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HACCP log entry not found")
        _ensure_outlet_access(self.db, user, entry.outlet_id)
        return entry

    def create(self, user, payload: HaccpLogCreate) -> HaccpLogEntry:
        _ensure_outlet_access(self.db, user, payload.outlet_id)
        values = payload.model_dump()
        ccp = (values.get("ccp_name") or "").strip().lower()
        values["ccp_name"] = ccp
        ranges = HACCP_DEFAULT_RANGES.get(ccp, {})
        if values.get("target_min") is None:
            values["target_min"] = ranges.get("target_min")
        if values.get("target_max") is None:
            values["target_max"] = ranges.get("target_max")
        values["passed"] = _evaluate_passed(
            values["reading_value"],
            values.get("target_min"),
            values.get("target_max"),
        )
        values["recorded_at"] = values.get("recorded_at") or datetime.now(UTC)
        entry = HaccpLogEntry(**values, created_by=user.id)
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def update(self, user, entry_id: UUID, payload: HaccpLogUpdate) -> HaccpLogEntry:
        entry = self.get(user, entry_id)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(entry, key, value)
        entry.passed = _evaluate_passed(
            entry.reading_value,
            entry.target_min,
            entry.target_max,
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def delete(self, user, entry_id: UUID) -> None:
        entry = self.get(user, entry_id)
        self.db.delete(entry)
        self.db.commit()

    def summary(self, user) -> HaccpLogSummary:
        entries = self.list(user)
        passed = sum(1 for entry in entries if entry.passed)
        failed = len(entries) - passed
        by_ccp: dict[str, dict[str, int]] = {}
        for entry in entries:
            bucket = by_ccp.setdefault(entry.ccp_name, {"total": 0, "passed": 0, "failed": 0})
            bucket["total"] += 1
            bucket["passed"] += 1 if entry.passed else 0
            bucket["failed"] += 0 if entry.passed else 1
        return HaccpLogSummary(
            total=len(entries),
            passed=passed,
            failed=failed,
            critical_failures=failed,
            by_ccp=by_ccp,
        )

    def latest_for_ccp(self, user, outlet_id: UUID, ccp_name: str) -> HaccpLogEntry | None:
        _ensure_outlet_access(self.db, user, outlet_id)
        return self.db.scalar(
            select(HaccpLogEntry)
            .where(
                HaccpLogEntry.outlet_id == outlet_id,
                HaccpLogEntry.ccp_name == ccp_name.strip().lower(),
            )
            .order_by(HaccpLogEntry.recorded_at.desc())
            .limit(1)
        )

    def counts_by_outlet(self, user) -> list[dict]:
        allowed = accessible_outlet_ids(self.db, user)
        statement = select(HaccpLogEntry.outlet_id, func.count(HaccpLogEntry.id)).group_by(
            HaccpLogEntry.outlet_id
        )
        if allowed is not None:
            if not allowed:
                return []
            statement = statement.where(HaccpLogEntry.outlet_id.in_(allowed))
        rows = self.db.execute(statement).all()
        return [
            {"outlet_id": str(outlet_id), "total": total}
            for outlet_id, total in rows
        ]
