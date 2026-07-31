from types import SimpleNamespace

from app.core import database as _database  # noqa: F401
from app.modules.announcements.service import AnnouncementService


def _user(role_slug: str = "outlet"):
    return SimpleNamespace(
        role=SimpleNamespace(
            slug=role_slug,
            permissions=[SimpleNamespace(code="notification.read")],
        ),
        is_active=True,
        region_id=None,
        district_id=None,
    )


def _outlet():
    return SimpleNamespace(
        id="outlet-a",
        code="OUTLET-A",
        name="Outlet A",
        region_id="region-a",
        district_id="district-a",
        region=SimpleNamespace(code="REG-A", name="Region A"),
        district=SimpleNamespace(code="DIST-A", name="District A"),
    )


def _service_with_outlet(monkeypatch):
    service = AnnouncementService(db=None)
    monkeypatch.setattr(service, "_identity_outlets_for_user", lambda _user: [_outlet()])
    monkeypatch.setattr(service, "_legacy_outlets", lambda _outlets: [])
    return service


def test_announcement_matches_assigned_outlet_region_and_district(monkeypatch):
    service = _service_with_outlet(monkeypatch)
    user = _user()

    assert service._matches_scope_values(
        scope="outlet",
        target_ids=["outlet-a"],
        identity_user=user,
    )
    assert service._matches_scope_values(
        scope="region",
        target_ids=["region-a"],
        identity_user=user,
    )
    assert service._matches_scope_values(
        scope="district",
        target_ids=["district-a"],
        identity_user=user,
    )


def test_scoped_announcement_without_target_matches_nobody(monkeypatch):
    service = _service_with_outlet(monkeypatch)

    assert not service._matches_scope_values(
        scope="outlet",
        target_ids=[],
        identity_user=_user(),
    )


def test_only_active_users_with_notification_read_can_receive():
    assert AnnouncementService._can_receive_notifications(_user())

    inactive = _user()
    inactive.is_active = False
    assert not AnnouncementService._can_receive_notifications(inactive)

    no_permission = _user()
    no_permission.role.permissions = []
    assert not AnnouncementService._can_receive_notifications(no_permission)
