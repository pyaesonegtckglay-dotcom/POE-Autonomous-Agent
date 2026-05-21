from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, Enum as SAEnum
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PLANNING = "planning"
    RUNNING = "running"
    VERIFYING = "verifying"
    REPAIRING = "repairing"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    dag = Column(JSON, nullable=True)
    execution_result = Column(JSON, nullable=True)
    repair_history = Column(JSON, default=list)
    logs = Column(JSON, default=list)
    files_created = Column(JSON, default=list)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class DeploymentRecord(Base):
    __tablename__ = "deployments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), nullable=True)
    target = Column(String(50), nullable=False)  # hf, vercel
    status = Column(String(50), default="pending")
    url = Column(String(500), nullable=True)
    logs = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
