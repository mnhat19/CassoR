import asyncio
from pathlib import Path

import pandas as pd
import structlog
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.expertise import Expertise, Title

logger = structlog.get_logger()

COLUMN_TO_TRACK_LEVEL: dict[str, tuple[str, int]] = {
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


def resolve_expertise_grid_path(root_dir: Path) -> Path:
    data_dir = Path(__file__).parent / "data"
    csv_path = data_dir / "expertise_grid.csv"
    xlsx_path = data_dir / "expertise_grid.xlsx"
    if csv_path.exists():
        return csv_path
    return xlsx_path


def load_dataframe(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".xlsx":
        return pd.read_excel(path)
    return pd.read_csv(path, encoding="utf-8-sig")


async def sync_titles_from_expertise_grid() -> None:
    root_dir = Path(__file__).resolve().parents[2]
    data_path = resolve_expertise_grid_path(root_dir)
    df = load_dataframe(data_path)

    async with AsyncSessionLocal() as session:
        expertise_rows = await session.execute(select(Expertise))
        expertise_map = {row.code: row for row in expertise_rows.scalars().all()}

        created = 0
        updated = 0
        shared = 0
        removed = 0

        stale_shared_rows = await session.execute(
            select(Title).where(
                Title.expertise_code.is_not(None),
                Title.track == "Leadership",
                Title.level.in_(SHARED_LEADERSHIP_LEVELS),
            )
        )
        for title in stale_shared_rows.scalars().all():
            await session.delete(title)
            removed += 1

        for _, row in df.iterrows():
            code = str(row.get("Code", "")).strip()
            if not code or code not in expertise_map:
                continue
            expertise = expertise_map[code]

            for col, (track, level) in COLUMN_TO_TRACK_LEVEL.items():
                value = row.get(col)
                if pd.isna(value):
                    continue
                title_text = str(value).strip()
                if not title_text:
                    continue

                if track == "Leadership" and level in SHARED_LEADERSHIP_LEVELS:
                    shared += 1
                    continue

                existing = await session.execute(
                    select(Title).where(
                        Title.expertise_code == code,
                        Title.track == track,
                        Title.level == level,
                    )
                )
                title_obj = existing.scalar_one_or_none()
                if title_obj:
                    title_obj.title = title_text
                    title_obj.expertise_name = expertise.name
                    title_obj.expertise_group = expertise.group_name
                    title_obj.expertise_segment = expertise.segment
                    updated += 1
                    continue

                session.add(
                    Title(
                        title=title_text,
                        vietnamese=None,
                        expertise_code=code,
                        expertise_name=expertise.name,
                        expertise_group=expertise.group_name,
                        expertise_segment=expertise.segment,
                        track=track,
                        level=level,
                        desc=None,
                        general_requirement=None,
                        exp_requirement=None,
                    )
                )
                created += 1

        await session.commit()

    logger.info(
        "seed.completed",
        table="titles",
        created=created,
        updated=updated,
        shared=shared,
        removed=removed,
        source=str(data_path),
    )


if __name__ == "__main__":
    asyncio.run(sync_titles_from_expertise_grid())
