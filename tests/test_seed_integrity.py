import importlib
from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy import func, select


EXPERTISE_TITLE_COLUMNS = {
    "Trainee": ("Trainee", 1),
    "Intern": ("Intern", 1),
    "Professional Track L1": ("Professional", 1),
    "Professional Track L2": ("Professional", 2),
    "Professional Track L3": ("Professional", 3),
    "Professional Track L4": ("Professional", 4),
    "Professional Track L5": ("Professional", 5),
    "Management Track L3": ("Management", 3),
    "Management Track L4": ("Management", 4),
    "Management Track L5": ("Management", 5),
    "Leadership Track L4": ("Leadership", 4),
    "Leadership Track L5": ("Leadership", 5),
    "Leadership Track L6": ("Leadership", 6),
}

SHARED_LEADERSHIP_LEVELS = {5, 6}


def reload_modules() -> None:
    import app.config as config
    import app.database as database
    import app.models.employee as employee_models
    import app.models.expertise as expertise_models
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


@pytest.mark.asyncio
async def test_seed_integrity(tmp_path, monkeypatch) -> None:
    db_path = tmp_path / "cassor_seed_test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")

    reload_modules()

    from app.database import Base, engine
    from app.models.employee import Employee
    from app.models.expertise import Expertise, Title
    from app.seed.load_employees import SAMPLE_EMPLOYEES
    from app.seed.load_employees import seed_employees
    from app.seed.load_expertise import seed_expertise
    from app.seed.load_titles import seed_titles

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_expertise()
    await seed_titles()
    await seed_employees()

    data_dir = Path(__file__).resolve().parents[1] / "app" / "seed" / "data"
    expertise_path = data_dir / "expertise_grid.csv"
    titles_path = data_dir / "title_grid.xlsx"

    expertise_df = pd.read_csv(expertise_path, encoding="utf-8-sig")
    titles_df = pd.read_excel(titles_path)

    expected_title_slots = set()
    expertise_by_name = dict(zip(expertise_df["Expertise"], expertise_df["Code"]))
    for _, row in titles_df.iterrows():
        expertise_name = None if pd.isna(row["Expertise"]) else str(row["Expertise"]).strip()
        expertise_code = expertise_by_name.get(expertise_name) if expertise_name else None
        expected_title_slots.add(
            (expertise_code, str(row["Track"]).strip(), int(row["Level"]))
        )

    for _, row in expertise_df.iterrows():
        code = str(row["Code"]).strip()
        for column, (track, level) in EXPERTISE_TITLE_COLUMNS.items():
            title = row.get(column)
            if pd.isna(title) or not str(title).strip():
                continue
            if track == "Leadership" and level in SHARED_LEADERSHIP_LEVELS:
                expected_title_slots.add((None, track, level))
            else:
                expected_title_slots.add((code, track, level))

    async with engine.begin() as conn:
        expertise_count = await conn.scalar(select(func.count(Expertise.id)))
        title_count = await conn.scalar(select(func.count(Title.id)))
        employee_count = await conn.scalar(select(func.count(Employee.id)))
        title_rows = (
            await conn.execute(
                select(Title.expertise_code, Title.track, Title.level, Title.title)
            )
        ).all()

    assert expertise_count == len(expertise_df)
    assert title_count == len(expected_title_slots)
    assert employee_count == len(SAMPLE_EMPLOYEES)

    actual_title_slots = {(code, track, level) for code, track, level, _ in title_rows}
    assert actual_title_slots == expected_title_slots

    actual_titles = {
        (code, track, level): title for code, track, level, title in title_rows
    }
    for _, row in expertise_df.iterrows():
        code = str(row["Code"]).strip()
        for column, (track, level) in EXPERTISE_TITLE_COLUMNS.items():
            value = row.get(column)
            if pd.isna(value) or not str(value).strip():
                continue
            expected_key = (
                None if track == "Leadership" and level in SHARED_LEADERSHIP_LEVELS else code,
                track,
                level,
            )
            assert actual_titles[expected_key] == str(value).strip()
