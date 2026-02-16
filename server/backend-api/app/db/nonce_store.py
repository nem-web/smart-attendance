"""
Nonce store — replay-protection layer for QR tokens.

Strategy
────────
1. **Redis** (preferred): O(1) lookups, automatic TTL expiry, no cleanup jobs.
2. **MongoDB fallback**: If REDIS_URL is not configured we store nonces in a
   `qr_nonces` collection with a TTL index so documents self-delete.

Why not Redis-only?
The current project does not mandate Redis in every environment.  The
fallback keeps the feature usable in development / small deployments.

Every nonce is stored with an `expires_at` timestamp.  The TTL is set to
at least 15 seconds (≥ the token lifetime) so that a nonce can never be
removed before the token that carried it has expired.
"""

import os
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# ── Configuration ───────────────────────────────────────────────
REDIS_URL: str = os.getenv("REDIS_URL", "")
# Nonces survive at least this long after creation.  Must be ≥ QR TTL.
NONCE_TTL_SECONDS: int = int(os.getenv("NONCE_TTL_SECONDS", "30"))

# ── Redis backend ──────────────────────────────────────────────
_redis_client = None  # lazily initialised


async def _get_redis():
    """Return an async Redis client, creating it on first call."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    if not REDIS_URL:
        return None  # signal: fall back to Mongo

    try:
        import redis.asyncio as aioredis

        _redis_client = aioredis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3,
        )
        # Quick connectivity check
        await _redis_client.ping()
        logger.info("Redis connected for nonce storage")
        return _redis_client
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — falling back to MongoDB", exc)
        _redis_client = None
        return None


# ── MongoDB fallback ───────────────────────────────────────────
_mongo_index_ensured = False


async def _ensure_mongo_ttl_index():
    """Create a TTL index on `qr_nonces.expires_at` once per process."""
    global _mongo_index_ensured
    if _mongo_index_ensured:
        return

    from app.db.mongo import db

    # MongoDB automatically deletes documents once `expires_at` passes.
    await db.qr_nonces.create_index(
        "expires_at",
        expireAfterSeconds=0,
        background=True,
    )
    _mongo_index_ensured = True
    logger.info("MongoDB TTL index ensured on qr_nonces.expires_at")


# ── Public API ─────────────────────────────────────────────────


async def is_nonce_used(nonce: str) -> bool:
    """
    Return True if this nonce has already been consumed.

    Check-then-set is NOT atomic here on purpose — the subsequent
    `consume_nonce` call performs the actual atomic insert/set.
    This function is a fast pre-check to short-circuit early.
    """
    r = await _get_redis()

    if r is not None:
        # Redis: key exists → already used
        return bool(await r.exists(f"qr_nonce:{nonce}"))

    # MongoDB fallback
    from app.db.mongo import db

    await _ensure_mongo_ttl_index()
    doc = await db.qr_nonces.find_one({"_id": nonce})
    return doc is not None


async def consume_nonce(nonce: str) -> bool:
    """
    Atomically mark *nonce* as used.

    Returns True  → nonce was fresh and is now consumed.
    Returns False → nonce was already consumed (replay attempt).

    Redis path uses SET … NX (set-if-not-exists) which is atomic.
    Mongo path uses insert_one with `_id = nonce` so a duplicate raises
    DuplicateKeyError — equally atomic.
    """
    r = await _get_redis()

    if r is not None:
        # SET NX + EX guarantees atomicity; returns True only on first set.
        was_set = await r.set(
            f"qr_nonce:{nonce}",
            "1",
            nx=True,  # only set if key does NOT exist
            ex=NONCE_TTL_SECONDS,  # auto-expire
        )
        return bool(was_set)

    # MongoDB fallback — use _id uniqueness for atomicity
    from app.db.mongo import db

    await _ensure_mongo_ttl_index()
    from pymongo.errors import DuplicateKeyError

    try:
        await db.qr_nonces.insert_one(
            {
                "_id": nonce,
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(seconds=NONCE_TTL_SECONDS)
                ),
            }
        )
        return True  # fresh nonce — consumed successfully
    except DuplicateKeyError:
        # Nonce was already stored → replay attempt
        return False


async def close_redis():
    """Gracefully close the Redis connection pool (call on shutdown)."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed")
