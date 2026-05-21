from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
import structlog

from app.core.config import settings
from app.core.redis_client import redis_set, redis_get, redis_delete
from app.services.task_runner import run_task

router = APIRouter()
logger = structlog.get_logger()


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "normal"
    tags: Optional[List[str]] = []


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    dag: Optional[dict] = None
    execution_result: Optional[dict] = None
    repair_history: Optional[list] = []
    logs: Optional[list] = []
    files_created: Optional[list] = []
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None


@router.post("/tasks", response_model=TaskResponse, status_code=201)
async def create_task(payload: TaskCreate, background_tasks: BackgroundTasks):
    """Submit a new task for autonomous execution."""
    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    task_data = {
        "id": task_id,
        "title": payload.title,
        "description": payload.description or payload.title,
        "status": "pending",
        "priority": payload.priority,
        "tags": payload.tags,
        "dag": None,
        "execution_result": None,
        "repair_history": [],
        "logs": [{"ts": now, "level": "info", "msg": f"Task created: {payload.title}"}],
        "files_created": [],
        "error_message": None,
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }

    # Persist initial state to Redis (primary storage)
    await redis_set(f"task:{task_id}", task_data, expire=86400 * 7)

    # Try to persist to DB (non-fatal)
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.task import Task, TaskStatus

        async with AsyncSessionLocal() as session:
            db_task = Task(
                id=task_id,
                title=payload.title,
                description=payload.description,
                status=TaskStatus.PENDING,
                logs=task_data["logs"],
            )
            session.add(db_task)
            await session.commit()
    except Exception as e:
        logger.warning("db_create_failed_non_fatal", task_id=task_id, error=str(e)[:100])
        # DB failure is non-fatal - Redis is primary storage

    logger.info("task_created", task_id=task_id, title=payload.title)

    # Queue background execution
    background_tasks.add_task(run_task, task_id, task_data)

    return TaskResponse(**task_data)


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """Get task status and details."""
    # Try Redis first (fast)
    task_data = await redis_get(f"task:{task_id}")
    
    if task_data:
        return TaskResponse(**{k: task_data.get(k) for k in TaskResponse.__fields__})

    # Fall back to DB
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.task import Task
        from sqlalchemy import select

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            if task:
                return TaskResponse(
                    id=task.id,
                    title=task.title,
                    description=task.description,
                    status=task.status.value,
                    dag=task.dag,
                    execution_result=task.execution_result,
                    repair_history=task.repair_history or [],
                    logs=task.logs or [],
                    files_created=task.files_created or [],
                    error_message=task.error_message,
                    created_at=str(task.created_at) if task.created_at else None,
                    updated_at=str(task.updated_at) if task.updated_at else None,
                    completed_at=str(task.completed_at) if task.completed_at else None,
                )
    except Exception as e:
        logger.warning("db_read_failed", task_id=task_id, error=str(e))

    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel a running task."""
    task_data = await redis_get(f"task:{task_id}")
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_data.get("status") in ("complete", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel task in {task_data['status']} state")

    task_data["status"] = "cancelled"
    task_data["updated_at"] = datetime.utcnow().isoformat()
    await redis_set(f"task:{task_id}", task_data, expire=86400 * 7)
    
    logger.info("task_cancelled", task_id=task_id)
    return {"id": task_id, "status": "cancelled", "message": "Task cancelled"}


@router.post("/tasks/{task_id}/resume")
async def resume_task(task_id: str, background_tasks: BackgroundTasks):
    """Resume a failed task."""
    task_data = await redis_get(f"task:{task_id}")
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_data.get("status") not in ("failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot resume task in {task_data['status']} state")

    task_data["status"] = "pending"
    task_data["updated_at"] = datetime.utcnow().isoformat()
    await redis_set(f"task:{task_id}", task_data, expire=86400 * 7)

    background_tasks.add_task(run_task, task_data["id"], task_data)
    
    logger.info("task_resumed", task_id=task_id)
    return {"id": task_id, "status": "pending", "message": "Task resumed"}


@router.get("/tasks")
async def list_tasks(limit: int = 20, offset: int = 0):
    """List recent tasks."""
    tasks = []
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.task import Task
        from sqlalchemy import select, desc

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Task).order_by(desc(Task.created_at)).offset(offset).limit(limit)
            )
            db_tasks = result.scalars().all()
            for t in db_tasks:
                tasks.append({
                    "id": t.id,
                    "title": t.title,
                    "status": t.status.value,
                    "created_at": str(t.created_at),
                    "updated_at": str(t.updated_at),
                })
    except Exception as e:
        logger.warning("list_tasks_db_failed", error=str(e))

    return {"tasks": tasks, "total": len(tasks), "limit": limit, "offset": offset}
