"""Pure helpers for schedule publish vs overdue timing (no ORM imports)."""

from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo


def resolve_publish_time(publish_time: str | None, due_time: str | None = None) -> str:
    return publish_time or due_time or "09:00"


def resolve_due_time(due_time: str | None) -> str:
    return due_time or "17:00"


def is_past_clock_time(clock_time: str, current: datetime) -> bool:
    try:
        hour, minute = [int(part) for part in clock_time.split(":")]
    except (TypeError, ValueError):
        hour, minute = 9, 0

    return current.time() >= time(hour=hour, minute=minute)


def parse_clock(clock_time: str, *, fallback: tuple[int, int]) -> tuple[int, int]:
    try:
        hour, minute = [int(part) for part in clock_time.split(":")]
        return hour, minute
    except (TypeError, ValueError):
        return fallback


def build_due_datetime(
    *,
    local_current: datetime,
    publish_time: str,
    due_time: str,
    tz: ZoneInfo,
) -> datetime:
    """Build local due datetime; if due <= publish same day, roll to next day."""
    due_hour, due_minute = parse_clock(due_time, fallback=(17, 0))
    publish_hour, publish_minute = parse_clock(publish_time, fallback=(9, 0))

    local_due = datetime(
        year=local_current.year,
        month=local_current.month,
        day=local_current.day,
        hour=due_hour,
        minute=due_minute,
        tzinfo=tz,
    )
    local_publish = datetime(
        year=local_current.year,
        month=local_current.month,
        day=local_current.day,
        hour=publish_hour,
        minute=publish_minute,
        tzinfo=tz,
    )
    if local_due <= local_publish:
        local_due += timedelta(days=1)
    return local_due


def should_publish_recurring(
    *,
    recurrence: str,
    publish_time: str,
    local_current: datetime,
    weekly_publish_day: str | None = None,
    monthly_publish_day: int | None = None,
    weekday_to_name: dict[int, str] | None = None,
) -> bool:
    from calendar import day_name

    names = weekday_to_name or {index: name.lower() for index, name in enumerate(day_name)}

    if recurrence == "daily":
        return is_past_clock_time(publish_time, local_current)

    if recurrence == "weekly":
        if not weekly_publish_day:
            return False
        current_day = names[local_current.weekday()]
        if current_day != weekly_publish_day.lower():
            return False
        return is_past_clock_time(publish_time, local_current)

    if recurrence == "monthly":
        if not monthly_publish_day:
            return False
        publish_day = min(monthly_publish_day, 28)
        if local_current.day != publish_day:
            return False
        return is_past_clock_time(publish_time, local_current)

    return False
