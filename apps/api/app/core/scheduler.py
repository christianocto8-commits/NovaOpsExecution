import os

from fastapi import HTTPException, status


def verify_scheduler_secret(x_scheduler_secret: str | None) -> None:
    configured_secret = os.environ.get("TASK_SCHEDULER_SECRET")
    environment = (os.environ.get("ENVIRONMENT") or os.environ.get("APP_ENV") or "local").lower()

    if environment == "production" and not configured_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Scheduler secret is not configured",
        )

    if configured_secret and x_scheduler_secret != configured_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid scheduler secret",
        )
