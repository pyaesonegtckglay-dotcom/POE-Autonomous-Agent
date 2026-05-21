import redis.asyncio as aioredis
from app.core.config import settings
import structlog
import json
from typing import Any, Optional

logger = structlog.get_logger()

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
        )
    return _redis_client


async def redis_set(key: str, value: Any, expire: int = 3600) -> bool:
    try:
        client = await get_redis()
        data = json.dumps(value) if not isinstance(value, str) else value
        await client.set(key, data, ex=expire)
        return True
    except Exception as e:
        logger.error("redis_set_failed", key=key, error=str(e))
        return False


async def redis_get(key: str) -> Optional[Any]:
    try:
        client = await get_redis()
        data = await client.get(key)
        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return data
        return None
    except Exception as e:
        logger.error("redis_get_failed", key=key, error=str(e))
        return None


async def redis_delete(key: str) -> bool:
    try:
        client = await get_redis()
        await client.delete(key)
        return True
    except Exception as e:
        logger.error("redis_delete_failed", key=key, error=str(e))
        return False


async def redis_lpush(key: str, value: Any) -> bool:
    try:
        client = await get_redis()
        data = json.dumps(value) if not isinstance(value, str) else value
        await client.lpush(key, data)
        return True
    except Exception as e:
        logger.error("redis_lpush_failed", key=key, error=str(e))
        return False


async def redis_brpop(key: str, timeout: int = 5) -> Optional[Any]:
    try:
        client = await get_redis()
        result = await client.brpop(key, timeout=timeout)
        if result:
            _, data = result
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return data
        return None
    except Exception as e:
        logger.error("redis_brpop_failed", key=key, error=str(e))
        return None


async def redis_publish(channel: str, message: Any) -> bool:
    try:
        client = await get_redis()
        data = json.dumps(message) if not isinstance(message, str) else message
        await client.publish(channel, data)
        return True
    except Exception as e:
        logger.error("redis_publish_failed", channel=channel, error=str(e))
        return False
