import asyncio
from pathlib import Path

import pandas as pd
import structlog
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.expertise import Expertise, Title

logger = structlog.get_logger()


def normalize_column(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def load_dataframe(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path, encoding="utf-8-sig")
    return pd.read_excel(path)


def clean_text(value: object) -> str | None:
    text = str(value).strip()
    if text.lower() in {"nan", "none", ""}:
        return None
    return text

def map_columns(df: pd.DataFrame) -> pd.DataFrame:
    col_map = {normalize_column(col): col for col in df.columns}
    required = {
        "title": "title",
        "vietnamese": "vietnamese",
        "expertise": "expertise",
        "expertisegroup": "expertise_group",
        "expertisesegment": "expertise_segment",
        "track": "track",
        "level": "level",
    }
    optional = {
        "desc": "desc",
        "generalrequirement": "general_requirement",
        "exprequirement": "exp_requirement",
    }
    data = {}
    for key, target in required.items():
        if key not in col_map:
            raise KeyError(f"Missing column: {key}")
        data[target] = df[col_map[key]]
        
    for key, target in optional.items():
        if key in col_map:
            data[target] = df[col_map[key]]
        else:
            data[target] = pd.Series([None] * len(df))
            
    return pd.DataFrame(data)


async def seed_titles() -> None:
    data_dir = Path(__file__).parent / "data"
    csv_path = data_dir / "title_grid.csv"
    xlsx_path = data_dir / "title_grid.xlsx"
    data_path = csv_path if csv_path.exists() else xlsx_path
    try:
        df = map_columns(load_dataframe(data_path))
    except Exception as exc:  # pragma: no cover - logged for ops
        logger.error("seed.failed", file=str(data_path), error=str(exc))
        raise

    async with AsyncSessionLocal() as session:
        expertise_rows = await session.execute(select(Expertise.code, Expertise.name))
        expertise_map = {name: code for code, name in expertise_rows.all()}

        existing_rows = await session.execute(select(Title))
        existing_by_slot = {
            (row.expertise_code, row.track, row.level): row
            for row in existing_rows.scalars().all()
        }

        created = 0
        updated = 0
        for _, row in df.iterrows():
            expertise_name = clean_text(row["expertise"])
            expertise_code = expertise_map.get(expertise_name) if expertise_name else None
            track = str(row["track"]).strip()
            level = int(row["level"])
            values = {
                "title": str(row["title"]).strip(),
                "vietnamese": clean_text(row["vietnamese"]),
                "expertise_code": expertise_code,
                "expertise_name": expertise_name,
                "expertise_group": clean_text(row["expertise_group"]),
                "expertise_segment": clean_text(row["expertise_segment"]),
                "track": track,
                "level": level,
                "desc": clean_text(row["desc"]),
                "general_requirement": clean_text(row["general_requirement"]),
                "exp_requirement": clean_text(row["exp_requirement"]),
            }
            slot = (expertise_code, track, level)
            title_obj = existing_by_slot.get(slot)
            if title_obj is None:
                title_obj = Title(**values)
                session.add(title_obj)
                existing_by_slot[slot] = title_obj
                created += 1
                continue

            for field, value in values.items():
                setattr(title_obj, field, value)
            updated += 1

        await session.commit()
        logger.info(
            "seed.completed",
            table="titles",
            created=created,
            updated=updated,
            row_count=len(df),
            source=str(data_path),
        )

    from app.seed.sync_titles_from_expertise_grid import sync_titles_from_expertise_grid

    await sync_titles_from_expertise_grid()


if __name__ == "__main__":
    asyncio.run(seed_titles())
