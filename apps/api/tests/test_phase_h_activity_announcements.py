"""Tests for activity feed and announcements APIs."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.outlet import Outlet


def test_activity_feed_requires_auth(client: TestClient):
    response = client.get("/api/v1/activity/feed")
    assert response.status_code == 401


def test_activity_feed_returns_paginated_items(client: TestClient, auth_headers: dict[str, str]):
    response = client.get("/api/v1/activity/feed?limit=10", headers=auth_headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "total" in payload
    assert "items" in payload
    assert isinstance(payload["items"], list)


def test_announcements_crud_and_publish(client: TestClient, auth_headers: dict[str, str], db: Session):
    create_response = client.post(
        "/api/v1/announcements",
        headers=auth_headers,
        json={
            "title": "Test Pengumuman",
            "body": "Isi pengumuman uji coba.",
            "priority": "high",
            "target_scope": "all",
            "requires_acknowledgment": True,
        },
    )
    assert create_response.status_code == 201, create_response.text
    announcement_id = create_response.json()["id"]
    assert create_response.json()["published_at"] is None

    publish_response = client.post(
        f"/api/v1/announcements/{announcement_id}/publish",
        headers=auth_headers,
    )
    assert publish_response.status_code == 200, publish_response.text
    assert publish_response.json()["published_at"] is not None

    active_response = client.get("/api/v1/announcements/active", headers=auth_headers)
    assert active_response.status_code == 200, active_response.text
    active_items = active_response.json()
    assert any(item["id"] == announcement_id for item in active_items)

    unread_response = client.get("/api/v1/announcements/unread-count", headers=auth_headers)
    assert unread_response.status_code == 200
    assert unread_response.json()["unread_count"] >= 1

    read_response = client.post(
        f"/api/v1/announcements/{announcement_id}/read",
        headers=auth_headers,
    )
    assert read_response.status_code == 200, read_response.text
    assert read_response.json()["read_at"] is not None

    ack_response = client.post(
        f"/api/v1/announcements/{announcement_id}/acknowledge",
        headers=auth_headers,
    )
    assert ack_response.status_code == 200, ack_response.text
    assert ack_response.json()["acknowledged_at"] is not None

    feed_response = client.get("/api/v1/activity/feed?limit=200", headers=auth_headers)
    assert feed_response.status_code == 200
    feed_actions = [item["action"] for item in feed_response.json()["items"]]
    assert "announcement_published" in feed_actions

    delete_response = client.delete(
        f"/api/v1/announcements/{announcement_id}",
        headers=auth_headers,
    )
    assert delete_response.status_code == 204


def test_announcement_outlet_scope(client: TestClient, auth_headers: dict[str, str], db: Session):
    outlet = db.query(Outlet).first()
    assert outlet is not None

    create_response = client.post(
        "/api/v1/announcements",
        headers=auth_headers,
        json={
            "title": "Scoped Announcement",
            "body": "Hanya untuk outlet tertentu.",
            "target_scope": "outlet",
            "target_ids": [str(outlet.id)],
        },
    )
    assert create_response.status_code == 201
    announcement_id = create_response.json()["id"]

    publish_response = client.post(
        f"/api/v1/announcements/{announcement_id}/publish",
        headers=auth_headers,
    )
    assert publish_response.status_code == 200

    active_response = client.get("/api/v1/announcements/active", headers=auth_headers)
    assert active_response.status_code == 200
    assert isinstance(active_response.json(), list)

    client.delete(f"/api/v1/announcements/{announcement_id}", headers=auth_headers)


def test_announcements_list_requires_manage_permission(client: TestClient, auth_headers: dict[str, str]):
    response = client.get("/api/v1/announcements", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
