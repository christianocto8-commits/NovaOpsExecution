from __future__ import annotations

from dataclasses import dataclass

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


def upload_bytes(*, key: str, content: bytes, content_type: str) -> str:
    import boto3
    from botocore.client import Config

    s3 = get_s3_settings()
    if not s3:
        raise RuntimeError("S3 is not configured")

    client_kwargs: dict = {
        "endpoint_url": s3.endpoint,
        "aws_access_key_id": s3.access_key,
        "aws_secret_access_key": s3.secret_key,
        "config": Config(signature_version="s3v4"),
    }

    if s3.region:
        client_kwargs["region_name"] = s3.region

    client = boto3.client("s3", **client_kwargs)
    client.put_object(
        Bucket=s3.bucket,
        Key=key,
        Body=content,
        ContentType=content_type,
    )

    return build_object_url(key)
