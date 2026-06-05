import importlib
from pathlib import Path

import pytest


def reload_modules() -> None:
    import app.config as config
    import app.database as database
    import app.models.employee as employee_models
    import app.models.expertise as expertise_models
    import app.seed.load_employees as load_employees
    import app.seed.load_expertise as load_expertise
    import app.seed.load_titles as load_titles
    import app.services.radar as radar

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(expertise_models)
    importlib.reload(employee_models)
    importlib.reload(load_expertise)
    importlib.reload(load_titles)
    importlib.reload(load_employees)
    importlib.reload(radar)


@pytest.mark.asyncio
async def test_radar_pyramid_counts_all_employees() -> None:
    db_path = Path("cassor_phase4_test.db")
    if db_path.exists():
        db_path.unlink()

    import os

    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"

    reload_modules()

    from app.database import AsyncSessionLocal, Base, engine
    from app.seed.load_employees import SAMPLE_EMPLOYEES, seed_employees
    from app.seed.load_expertise import seed_expertise
    from app.seed.load_titles import seed_titles
    from app.services.radar import build_pyramid

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_expertise()
    await seed_titles()
    await seed_employees()

    async with AsyncSessionLocal() as session:
        entries = await build_pyramid(session, expertise_group=None)

    total_count = sum(entry.count for entry in entries)
    assert total_count == len(SAMPLE_EMPLOYEES)
