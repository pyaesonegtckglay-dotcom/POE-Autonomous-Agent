from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
import structlog

logger = structlog.get_logger()


class Base(DeclarativeBase):
    pass


def get_async_db_url(url: str) -> str:
    """Convert sync postgres URL to async."""
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


_db_url = get_async_db_url(settings.DATABASE_URL)

# Use statement_cache_size=0 for pgbouncer compatibility (Supabase uses pgbouncer)
_connect_args = {}
if "asyncpg" in _db_url:
    _connect_args = {"statement_cache_size": 0}

async_engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=5,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all database tables."""
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("database_tables_created")
    except Exception as e:
        logger.warning("database_create_tables_failed", error=str(e))
