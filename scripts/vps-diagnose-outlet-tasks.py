#!/usr/bin/env python3
"""Diagnose outlet task visibility for a given identity user email."""
import sys

from app.core.database import SessionLocal
from app.modules.tasks.identity_bridge import (
    get_identity_user_by_email,
    resolve_legacy_outlet_id,
    sync_identity_access,
)
from app.modules.tasks.repository import TaskRepository


def main() -> None:
    email = sys.argv[1] if len(sys.argv) > 1 else "kov.sula@gmail.com"
    db = SessionLocal()
    try:
        identity_user = get_identity_user_by_email(db, email)
        if not identity_user:
            print(f"NO_IDENTITY_USER {email}")
            return

        legacy_user, outlet_ids, full_access = sync_identity_access(db, identity_user)
        db.commit()
        print("email", email)
        print("identity_outlet_id", identity_user.outlet_id)
        print("legacy_user_id", legacy_user.id)
        print("legacy_outlet_ids", outlet_ids)
        print("full_access", full_access)

        if identity_user.outlet_id:
            legacy_from_uuid = resolve_legacy_outlet_id(db, str(identity_user.outlet_id))
            print("legacy_from_uuid", legacy_from_uuid)

        repo = TaskRepository(db)
        if full_access:
            tasks = repo.list_all()
            print("scope", "all")
        elif outlet_ids:
            tasks = repo.list_by_outlets(outlet_ids) if len(outlet_ids) > 1 else repo.list_by_outlet(outlet_ids[0])
            print("scope", "outlet", outlet_ids)
        else:
            tasks = []
            print("scope", "none")

        print("task_count", len(tasks))
        for task in tasks:
            print("task", task.id, task.title, "outlet_id=", task.outlet_id)
    finally:
        db.close()


if __name__ == "__main__":
    main()
