from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import asyncio
import json
import structlog

from app.core.redis_client import redis_get, get_redis

router = APIRouter()
logger = structlog.get_logger()


@router.get("/logs/{task_id}")
async def get_logs(task_id: str):
    """Get all logs for a task."""
    task_data = await redis_get(f"task:{task_id}")
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")

    logs = task_data.get("logs", [])
    return {
        "task_id": task_id,
        "status": task_data.get("status"),
        "logs": logs,
        "count": len(logs),
    }


@router.get("/logs/{task_id}/stream")
async def stream_logs(task_id: str):
    """Stream live logs via Server-Sent Events."""

    async def event_generator():
        try:
            client = await get_redis()
            pubsub = client.pubsub()
            await pubsub.subscribe(f"task_logs:{task_id}")

            # First send existing logs
            task_data = await redis_get(f"task:{task_id}")
            if task_data:
                for log_entry in task_data.get("logs", []):
                    yield f"data: {json.dumps(log_entry)}\n\n"

            # Stream new logs
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        yield f"data: {json.dumps(data)}\n\n"
                    except Exception:
                        yield f"data: {json.dumps({'msg': str(message['data'])})}\n\n"

                # Check if task is done
                task_data = await redis_get(f"task:{task_id}")
                if task_data and task_data.get("status") in ("complete", "failed", "cancelled"):
                    yield f"data: {json.dumps({'msg': 'TASK_DONE', 'status': task_data.get('status')})}\n\n"
                    break

            await pubsub.unsubscribe(f"task_logs:{task_id}")
        except Exception as e:
            logger.error("log_stream_error", task_id=task_id, error=str(e))
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
