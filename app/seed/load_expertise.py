import asyncio
from pathlib import Path

import pandas as pd
import structlog
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.expertise import Expertise

logger = structlog.get_logger()


def normalize_column(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def resolve_path(root_dir: Path) -> Path:
    data_dir = Path(__file__).parent / "data"
    csv_path = data_dir / "expertise_grid.csv"
    xlsx_path = data_dir / "expertise_grid.xlsx"
    if csv_path.exists():
        return csv_path
    return xlsx_path


def ceiling_from_flag(flag: str | None) -> str | None:
    if not flag:
        return None
    if flag.endswith("5"):
        return "L5"
    if flag.endswith("3"):
        return "L3"
    if flag.endswith("2"):
        return "L2"
    return None


def load_dataframe(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".xlsx":
        return pd.read_excel(path)
    return pd.read_csv(path, encoding="utf-8-sig")


def map_columns(df: pd.DataFrame) -> pd.DataFrame:
    col_map = {normalize_column(col): col for col in df.columns}
    required = {
        "expertise": "expertise",
        "code": "code",
        "expertisegroup": "expertise_group",
        "segment": "segment",
        "flag": "flag",
        "enable": "enable",
    }
    data = {}
    for key, target in required.items():
        if key not in col_map:
            raise KeyError(f"Missing column: {key}")
        data[target] = df[col_map[key]]
    return pd.DataFrame(data)


async def seed_expertise() -> None:
    root_dir = Path(__file__).resolve().parents[2]  # kept for compat
    data_path = resolve_path(root_dir)
    try:
        df = map_columns(load_dataframe(data_path))
    except Exception as exc:  # pragma: no cover - logged for ops
        logger.error("seed.failed", file=str(data_path), error=str(exc))
        raise

    async with AsyncSessionLocal() as session:
        existing_rows = await session.execute(select(Expertise))
        existing_by_code = {row.code: row for row in existing_rows.scalars().all()}

        created = 0
        updated = 0
        for _, row in df.iterrows():
            code = str(row["code"]).strip()
            values = {
                "name": str(row["expertise"]).strip(),
                "group_name": str(row["expertise_group"]).strip(),
                "segment": str(row["segment"]).strip(),
                "flag": str(row["flag"]).strip(),
                "enable": str(row["enable"]).strip() in {"1", "true", "True"},
                "ceiling_prof": ceiling_from_flag(str(row["flag"]).strip()),
            }
            expertise = existing_by_code.get(code)
            if expertise is None:
                session.add(Expertise(code=code, **values))
                created += 1
                continue

            for field, value in values.items():
                setattr(expertise, field, value)
            updated += 1

        await session.commit()
        logger.info(
            "seed.completed",
            table="expertises",
            created=created,
            updated=updated,
            row_count=len(df),
        )


if __name__ == "__main__":
    asyncio.run(seed_expertise())
