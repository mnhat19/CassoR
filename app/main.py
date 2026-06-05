import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.explore import router as explore_router
from app.api.auth import router as auth_router
from app.api.me import router as me_router
from app.api.radar import router as radar_router
from app.api.payment import router as payment_router
from app.config import settings


# 1. Cấu hình Logging tập trung và đồng bộ với Standard Library
def configure_logging() -> None:
    logging.basicConfig(
        level=logging.getLevelName(settings.log_level.upper()),
        format="%(message)s",
    )
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,  # Thêm log level (INFO, WARN...) vào JSON
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.log_level.upper())
        ),
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


configure_logging()
logger = structlog.get_logger()


# 2. Sử dụng Lifespan để quản lý vòng đời ứng dụng (Khởi tạo/Đóng DB nếu có)
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting up CASSOR HRM Backend...")
    from app.database import Base, engine
    import app.models.employee  # noqa: F401
    import app.models.expertise  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-seed on first boot (empty DB) so Render cold-starts work without manual steps
    from sqlalchemy import text
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        count = (await session.execute(text("SELECT COUNT(*) FROM expertises"))).scalar()
    if count == 0:
        logger.info("Empty database detected — running seed...")
        from app.seed.load_expertise import seed_expertise
        from app.seed.load_titles import seed_titles
        from app.seed.load_employees import seed_employees
        from app.seed.load_users import seed_users
        await seed_expertise()
        await seed_titles()
        await seed_employees()
        await seed_users()
        logger.info("Seed complete.")

    yield
    logger.info("Shutting down CASSOR HRM Backend...")


# 3. Khởi tạo FastAPI với thông tin cấu hình đầy đủ
app = FastAPI(
    title="CASSOR HRM API",
    description="Backend API cho hệ thống quản trị nhân sự CASSOR",
    version="1.0.0",
    lifespan=lifespan,
)

# 4. Cấu hình Middleware CORS (Đọc origins linh hoạt từ file settings)
# Nếu trong settings.cors_origins là chuỗi dạng "http://localhost:5173,https://my_ui.com"
allowed_origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Khai báo các Routers kèm theo Prefix và Tags để phân nhóm trên Swagger /docs
app.include_router(explore_router, prefix="/api/v1/explore", tags=["Explore"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(me_router, prefix="/api/v1/me", tags=["Profile & Personal"])
app.include_router(radar_router, prefix="/api/v1/radar", tags=["Radar Analytics"])
app.include_router(payment_router, prefix="/api/v1/payment", tags=["Payment"])
