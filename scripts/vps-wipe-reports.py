#!/usr/bin/env python3
"""Wipe report-feeding data for all accounts/outlets on VPS.

Keeps users, outlets, roles, form templates, task schedules, and settings.

Usage (on API host, from repo / deploy root with PYTHONPATH set):
  CONFIRM=WIPE_REPORTS python3 scripts/vps-wipe-reports.py
"""

from __future__ import annotations

import os
import sys

from app.core.database import SessionLocal
from app.services.report_wipe import wipe_report_data_for_all_accounts


def main() -> int:
    confirm = (os.environ.get("CONFIRM") or "").strip().upper()
    if confirm not in {"WIPE_REPORTS", "WIPE REPORTS"}:
        print(
            'Refusing to run. Set CONFIRM=WIPE_REPORTS to pemutihkan report semua akun.',
            file=sys.stderr,
        )
        return 2

    db = SessionLocal()
    try:
        deleted = wipe_report_data_for_all_accounts(db)
        total = sum(deleted.values())
        print({"message": "report wipe complete", "total_deleted": total, "deleted": deleted})
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
