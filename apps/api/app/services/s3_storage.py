from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from app.core.config import get_settings


@dataclass(frozen=True)
class S3Settings:
    endpoint: str
    bucket: str
    access_key: str
    secret_key: str
    region: str | None = None


def get_s3_settings() -> S3Settings | None:
    settings = get_settings()

    if not all([settings.s3_endpoint, settings.s3_bucket, settings.s3_access_key, settings.s3_secret_key]):
        return None

    return S3Settings(
        endpoint=settings.s3_endpoint.rstrip("/"),
        bucket=settings.s3_bucket,
        access_key=settings.s3_access_key,
        secret_key=settings.s3_secret_key,
        region=settings.s3_region,
    )


def is_s3_configured() -> bool:
    return get_s3_settings() is not None


def build_object_url(key: str) -> str:
    s3 = get_s3_settings()
    if not s3:
        raise RuntimeError("S3 is not configured")

    return f"{s3.endpoint}/{s3.bucket}/{key}"


def _build_client_kwargs(s3: S3Settings) -> dict:
    from botocore.client import Config

    kwargs: dict = {
        "endpoint_url": s3.endpoint,
        "aws_access_key_id": s3.access_key,
        "aws_secret_access_key": s3.secret_key,
        "config": Config(signature_version="s3v4"),
    }
    if s3.region:
        kwargs["region_name"] = s3.region
    return kwargs


@lru_cache(maxsize=1)
def _get_cached_client():
    import boto3

    s3 = get_s3_settings()
    if not s3:
        raise RuntimeError("S3 is not configured")
    return boto3.client("s3", **_build_client_kwargs(s3))


def _get_client():
    # Invalidate cache if settings changed (e.g. in tests) — simple check
    s3 = get_s3_settings()
    if not s3:
        raise RuntimeError("S3 is not configured")
    try:
        client = _get_cached_client()
        # Verify endpoint matches current settings; if not, clear cache
        if client.meta.endpoint_url != s3.endpoint:
            _get_cached_client.cache_clear()
            client = _get_cached_client()
        return client
    except Exception:
        import boto3

        return boto3.client("s3", **_build_client_kwargs(s3))


def upload_bytes(*, key: str, content: bytes, content_type: str) -> str:
    s3 = get_s3_settings()
    if not s3:
        raise RuntimeError("S3 is not configured")

    client = _get_client()
    client.put_object(
        Bucket=s3.bucket,
        Key=key,
        Body=content,
        ContentType=content_type,
        CacheControl="public, max-age=31536000, immutable",
    )

    return key


def download_bytes(key: str) -> bytes:
    s3 = get_s3_settings()
    if not s3:
        raise RuntimeError("S3 is not configured")

    client = _get_client()
    response = client.get_object(Bucket=s3.bucket, Key=key)
    return response["Body"].read()


def generate_presigned_url(key: str, expires_in: int = 3600) -> str | None:
    s3 = get_s3_settings()
    if not s3:
        return None
    try:
        client = _get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": s3.bucket, "Key": key},
            ExpiresIn=expires_in,
        )
    except Exception:
        return None


def stream_s3_object(key: str, chunk_size: int = 8192):
    s3 = get_s3_settings()
    if not s3:
        raise RuntimeError("S3 is not configured")
    client = _get_client()
    response = client.get_object(Bucket=s3.bucket, Key=key)
    body = response["Body"]
    while True:
        chunk = body.read(chunk_size)
        if not chunk:
            break
        yield chunk
