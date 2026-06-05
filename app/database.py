from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

_db_url = settings.database_url
# Render supplies postgresql:// or postgres://; SQLAlchemy async needs +asyncpg driver
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
# asyncpg does not accept pgbouncer= as a connection kwarg — strip it
if "pgbouncer=" in _db_url:
    import re as _re
    _db_url = _re.sub(r"[&?]pgbouncer=[^&]*", "", _db_url).rstrip("?")

_is_postgres = _db_url.startswith("postgresql")
engine = create_async_engine(
    _db_url,
    echo=False,
    future=True,
    pool_pre_ping=_is_postgres,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()


async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
