from __future__ import annotations

import logging
import os
import threading
import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("novaops.http")

SLOW_REQUEST_THRESHOLD_MS = int(os.environ.get("SLOW_REQUEST_THRESHOLD_MS", "2000"))


class LoginRateLimiter:
    def __init__(self, limit: int, window_seconds: int = 60):
        self.limit = max(1, limit)
        self.window_seconds = max(1, window_seconds)
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def clear(self) -> None:
        with self._lock:
            self._attempts.clear()

    def allow(self, key: str, now: float | None = None) -> tuple[bool, int]:
        current = now if now is not None else time.monotonic()
        cutoff = current - self.window_seconds

        with self._lock:
            attempts = self._attempts[key]
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()

            if len(attempts) >= self.limit:
                retry_after = max(1, int(self.window_seconds - (current - attempts[0])))
                return False, retry_after

            attempts.append(current)
            return True, 0


login_rate_limiter = LoginRateLimiter(
    limit=int(os.environ.get("LOGIN_RATE_LIMIT_PER_MINUTE", "10")),
)

otp_rate_limiter = LoginRateLimiter(
    limit=int(os.environ.get("OTP_RATE_LIMIT_PER_MINUTE", "5")),
)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        # nginx appends the real remote address at the end.
        return forwarded.rsplit(",", 1)[-1].strip()
    return request.client.host if request.client else "unknown"


class HttpSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.monotonic()

        if request.method == "POST" and request.url.path == "/api/v1/auth/login":
            allowed, retry_after = login_rate_limiter.allow(_client_key(request))
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many login attempts. Try again later."},
                    headers={"Retry-After": str(retry_after)},
                )

        if request.method == "POST" and request.url.path == "/api/v1/auth/verify-otp":
            allowed, retry_after = otp_rate_limiter.allow(_client_key(request))
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many OTP attempts. Try again later."},
                    headers={"Retry-After": str(retry_after)},
                )

        response = await call_next(request)
        elapsed_ms = (time.monotonic() - start_time) * 1000

        if elapsed_ms >= SLOW_REQUEST_THRESHOLD_MS:
            logger.warning(
                "Slow request: %s %s took %.0fms (status %s)",
                request.method,
                request.url.path,
                elapsed_ms,
                response.status_code,
            )

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(self), geolocation=(self), microphone=()",
        )
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        )

        forwarded_proto = request.headers.get("x-forwarded-proto", "")
        if request.url.scheme == "https" or forwarded_proto.lower() == "https":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )

        return response
