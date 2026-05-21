"""
POE Autonomous Agent - Control Plane
FastAPI backend with task orchestration, execution, and deployment APIs.
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio

from app.core.config import settings
from app.api.tasks import router as tasks_router
from app.api.logs import router as logs_router
from app.api.deploy import router as deploy_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("poe_backend_starting", version=settings.APP_VERSION)
    
    # Create sandbox directory
    import os
    os.makedirs(settings.SANDBOX_BASE_PATH, exist_ok=True)
    
    # Try to create DB tables (non-fatal if DB unavailable)
    try:
        from app.core.database import create_tables
        await create_tables()
        logger.info("database_tables_ready")
    except Exception as e:
        logger.warning("database_init_failed", error=str(e))
    
    # Test Redis connection (non-fatal)
    try:
        from app.core.redis_client import get_redis
        client = await get_redis()
        await client.ping()
        logger.info("redis_connection_ok")
    except Exception as e:
        logger.warning("redis_connection_failed", error=str(e))
    
    logger.info("poe_backend_ready")
    yield
    logger.info("poe_backend_shutdown")


app = FastAPI(
    title="POE Autonomous Agent API",
    description="Production-grade autonomous AI developer operating system",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tasks_router, prefix="/api", tags=["Tasks"])
app.include_router(logs_router, prefix="/api", tags=["Logs"])
app.include_router(deploy_router, prefix="/api", tags=["Deploy"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint - returns HTTP 200 when healthy."""
    status = {"status": "healthy", "version": settings.APP_VERSION, "service": "POE Autonomous Agent"}
    
    # Check Redis
    try:
        from app.core.redis_client import get_redis
        client = await get_redis()
        await client.ping()
        status["redis"] = "connected"
    except Exception as e:
        status["redis"] = f"error: {str(e)[:50]}"
    
    # Check DB
    try:
        from app.core.database import async_engine
        async with async_engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        status["database"] = "connected"
    except Exception as e:
        status["database"] = f"error: {str(e)[:50]}"
    
    return JSONResponse(content=status)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "POE Autonomous Agent",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
        "status": "operational",
    }


@app.get("/api/stats")
async def get_stats():
    """Get system stats."""
    import psutil
    return {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage("/").percent,
        "sandbox_path": settings.SANDBOX_BASE_PATH,
    }
