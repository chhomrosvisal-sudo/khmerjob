import hashlib
import hmac
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.core.config import get_settings
from app.models import RateLimit


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def digest(value):
    return hmac.new(get_settings().jwt_secret.get_secret_value().encode(), value.encode(), hashlib.sha256).hexdigest()


def throttle(db, bucket, identity, maximum, seconds):
    if not get_settings().rate_limit_enabled:
        return
    key = digest(bucket + ':' + identity)
    now = utcnow()
    row = db.scalar(select(RateLimit).where(RateLimit.key == key).with_for_update())
    if row is None:
        try:
            with db.begin_nested():
                row = RateLimit(key=key, window_start=now, count=0)
                db.add(row)
                db.flush()
        except IntegrityError:
            row = db.scalar(select(RateLimit).where(RateLimit.key == key).with_for_update())
    if (now - row.window_start).total_seconds() >= seconds:
        row.window_start, row.count = now, 0
    if row.count >= maximum:
        db.commit()
        raise HTTPException(429, 'Too many attempts. Please try again later.', headers={'Retry-After': str(seconds)})
    row.count += 1
    db.commit()
