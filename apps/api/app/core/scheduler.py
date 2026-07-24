import os

from fastapi import HTTPException, status


def verify_scheduler_secret(x_scheduler_secret: str | None) -> None:
    configured_secret = os.environ.get("TASK_SCHEDULER_SECRET")
    if configured_secret and x_scheduler_secret != configured_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid scheduler secret",
        )
