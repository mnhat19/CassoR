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
    import app.services.title_resolver as title_resolver

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(expertise_models)
    importlib.reload(employee_models)
    importlib.reload(load_expertise)
    importlib.reload(load_titles)
    importlib.reload(load_employees)
    importlib.reload(title_resolver)


@pytest.mark.asyncio
async def test_title_resolver_inconsistent_titles() -> None:
    db_path = Path("cassor_phase3_test.db")
    if db_path.exists():
        db_path.unlink()

    import os

    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"

    reload_modules()

    from app.database import AsyncSessionLocal, Base, engine
    from app.seed.load_employees import seed_employees
    from app.seed.load_expertise import seed_expertise
    from app.seed.load_titles import seed_titles
    from app.services.title_resolver import resolve_title

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_expertise()
    await seed_titles()
    await seed_employees()

    mismatches = [
        "Chief Excutive Officer",
        "Technical Lead, Demo Division",
        "Senior Software Enginer",
    ]

    async with AsyncSessionLocal() as session:
        for raw_title in mismatches:
            resolved = await resolve_title(raw_title, session)
            assert resolved.matched_title is not None
            assert resolved.confidence >= 0.7

        if "Chief Excutive Officer" in mismatches:
            resolved = await resolve_title("Chief Excutive Officer", session)
            assert resolved.matched_title == "Chief Product Officer"
