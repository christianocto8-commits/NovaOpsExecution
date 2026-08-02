"""Publish time gates creation; due time sets overdue deadline."""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.modules.task_schedules.schedule_timing import (
    build_due_datetime,
    resolve_publish_time,
    should_publish_recurring,
)


def test_should_publish_uses_publish_time_not_due_time():
    publish_time = resolve_publish_time("09:00", "17:00")
    before = datetime(2026, 8, 2, 8, 30, tzinfo=ZoneInfo("Asia/Jakarta"))
    after = datetime(2026, 8, 2, 9, 5, tzinfo=ZoneInfo("Asia/Jakarta"))

    assert (
        should_publish_recurring(
            recurrence="daily",
            publish_time=publish_time,
            local_current=before,
        )
        is False
    )
    assert (
        should_publish_recurring(
            recurrence="daily",
            publish_time=publish_time,
            local_current=after,
        )
        is True
    )


def test_build_due_date_uses_due_time():
    tz = ZoneInfo("Asia/Jakarta")
    local_current = datetime(2026, 8, 2, 9, 10, tzinfo=tz)
    due = build_due_datetime(
        local_current=local_current,
        publish_time="09:00",
        due_time="17:00",
        tz=tz,
    )
    assert due.hour == 17
    assert due.minute == 0


def test_due_rolls_to_next_day_when_before_publish():
    tz = ZoneInfo("Asia/Jakarta")
    local_current = datetime(2026, 8, 2, 20, 10, tzinfo=tz)
    due = build_due_datetime(
        local_current=local_current,
        publish_time="20:00",
        due_time="06:00",
        tz=tz,
    )
    assert due.day == 3
    assert due.hour == 6
