"""Unit tests for refresh-token rotation / reuse detection."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.identity.security import hash_token
from app.modules.identity.service import AuthService, REFRESH_TOKEN_REUSE_GRACE_SECONDS


class _RefreshRepo:
    def __init__(self):
        self.active = {}
        self.all_by_hash = {}
        self.revoked_users = []

    def find_active_by_hash(self, token_hash: str):
        return self.active.get(token_hash)

    def find_by_hash_including_revoked(self, token_hash: str):
        return self.all_by_hash.get(token_hash)

    def revoke(self, token):
        self.active.pop(getattr(token, "token_hash", None), None)
        token.revoked_at = datetime.now(UTC)

    def revoke_all_for_user(self, user_id):
        self.revoked_users.append(user_id)
        self.active = {
            key: value for key, value in self.active.items() if value.user_id != user_id
        }


def _build_service(repo: _RefreshRepo):
    service = AuthService.__new__(AuthService)
    service.db = SimpleNamespace(commit=lambda: None, add=lambda _obj: None)
    service.refresh_tokens = repo
    service.users = SimpleNamespace(find_by_id=lambda _id: None)
    service.settings = SimpleNamespace(access_token_expire_minutes=30)
    return service


def test_refresh_rotation_rejects_reuse_and_revokes_family_when_stale():
    service = _build_service(_RefreshRepo())
    repo = service.refresh_tokens

    raw = "old-refresh-token"
    token_hash = hash_token(raw)
    user_id = uuid4()
    reused = SimpleNamespace(
        id=uuid4(),
        user_id=user_id,
        token_hash=token_hash,
        revoked_at=datetime.now(UTC) - timedelta(hours=2),
    )
    repo.all_by_hash[token_hash] = reused

    with pytest.raises(HTTPException) as exc:
        AuthService.refresh_tokens(
            service,
            raw_refresh_token=raw,
            ip_address="127.0.0.1",
            user_agent="test",
        )

    assert exc.value.status_code == 401
    assert user_id in repo.revoked_users


def test_refresh_reuse_within_grace_window_does_not_revoke_other_sessions():
    service = _build_service(_RefreshRepo())
    repo = service.refresh_tokens

    raw = "old-refresh-token"
    token_hash = hash_token(raw)
    user_id = uuid4()
    reused = SimpleNamespace(
        id=uuid4(),
        user_id=user_id,
        token_hash=token_hash,
        revoked_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    repo.all_by_hash[token_hash] = reused

    with pytest.raises(HTTPException) as exc:
        AuthService.refresh_tokens(
            service,
            raw_refresh_token=raw,
            ip_address="127.0.0.1",
            user_agent="test",
        )

    assert exc.value.status_code == 401
    assert user_id not in repo.revoked_users
    assert REFRESH_TOKEN_REUSE_GRACE_SECONDS >= 30
