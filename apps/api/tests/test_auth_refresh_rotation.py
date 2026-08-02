"""Unit tests for refresh-token rotation / reuse detection."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.identity.security import hash_token
from app.modules.identity.service import AuthService


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
        token.revoked_at = "revoked"

    def revoke_all_for_user(self, user_id):
        self.revoked_users.append(user_id)
        self.active = {
            key: value for key, value in self.active.items() if value.user_id != user_id
        }


def test_refresh_rotation_rejects_reuse_and_revokes_family():
    service = AuthService.__new__(AuthService)
    service.db = SimpleNamespace(commit=lambda: None)
    repo = _RefreshRepo()
    service.refresh_tokens = repo
    service.users = SimpleNamespace(find_by_id=lambda _id: None)
    service.settings = SimpleNamespace(access_token_expire_minutes=30)

    raw = "old-refresh-token"
    token_hash = hash_token(raw)
    user_id = uuid4()
    reused = SimpleNamespace(id=uuid4(), user_id=user_id, token_hash=token_hash, revoked_at="x")
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
