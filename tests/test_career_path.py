import importlib
from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy import select


def reload_modules() -> None:
    import app.config as config
    import app.database as database
    import app.models.employee as employee_models
    import app.models.expertise as expertise_models
    import app.services.career_path as career_path
    import app.seed.load_employees as load_employees
    import app.seed.load_expertise as load_expertise
    import app.seed.load_titles as load_titles
    import app.seed.sync_titles_from_expertise_grid as sync_titles_from_expertise_grid

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(expertise_models)
    importlib.reload(employee_models)
    importlib.reload(load_expertise)
    importlib.reload(sync_titles_from_expertise_grid)
    importlib.reload(load_titles)
    importlib.reload(load_employees)
    importlib.reload(career_path)


@pytest.mark.asyncio
async def test_career_path_software() -> None:
    db_path = Path("cassor_phase2_test.db")
    if db_path.exists():
        db_path.unlink()

    import os

    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"

    reload_modules()

    from app.database import Base, AsyncSessionLocal, engine
    from app.seed.load_employees import seed_employees
    from app.seed.load_expertise import seed_expertise
    from app.seed.load_titles import seed_titles
    from app.services.career_path import build_career_path

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_expertise()
    await seed_titles()
    await seed_employees()

    async with AsyncSessionLocal() as session:
        response = await build_career_path("E01", session)

    assert response.expertise.code == "E01"
    assert len(response.nodes) == 13
    assert any(edge.type == "bidirectional" for edge in response.edges)


@pytest.mark.asyncio
async def test_career_path_call_center_ceiling() -> None:
    import os

    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///cassor_phase2_test.db"
    reload_modules()

    from app.database import AsyncSessionLocal
    from app.services.career_path import build_career_path

    async with AsyncSessionLocal() as session:
        response = await build_career_path("E14", session)

    trainee = next(
        node for node in response.nodes if node.track == "Trainee" and node.level == 1
    )
    pro_l2 = next(
        node
        for node in response.nodes
        if node.track == "Professional" and node.level == 2
    )
    pro_l3 = next(
        node
        for node in response.nodes
        if node.track == "Professional" and node.level == 3
    )

    assert trainee.active is False
    assert pro_l2.active is True
    assert pro_l3.active is False


@pytest.mark.asyncio
async def test_career_path_uiux_no_leadership_l4() -> None:
    import os

    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///cassor_phase2_test.db"
    reload_modules()

    from app.database import AsyncSessionLocal
    from app.services.career_path import build_career_path

    async with AsyncSessionLocal() as session:
        response = await build_career_path("E07", session)

    lead_l4 = next(
        node
        for node in response.nodes
        if node.track == "Leadership" and node.level == 4
    )

    assert lead_l4.active is False
