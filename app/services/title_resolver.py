from __future__ import annotations

from dataclasses import dataclass
import difflib
import re

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expertise import Title

logger = structlog.get_logger()

DEFAULT_THRESHOLD = 0.7

KNOWN_MISMATCHES = {
    "chief excutive officer": "Chief Product Officer",
}


@dataclass(frozen=True)
class ResolvedTitle:
    matched_title: str | None
    track: str | None
    level: int | None
    expertise_code: str | None
    confidence: float


def normalize_title(value: str) -> str:
    if "," in value and "division" in value.lower():
        value = value.split(",")[0]
    value = value.strip().lower()
    value = value.replace(",", " ")
    value = re.sub(r"\s+", " ", value)
    return value


def resolve_title_from_titles(
    raw_title: str, titles: list[Title], threshold: float = DEFAULT_THRESHOLD
) -> ResolvedTitle:
    if not raw_title:
        return ResolvedTitle(None, None, None, None, 0.0)

    normalized_raw = normalize_title(raw_title)
    mapped_title = KNOWN_MISMATCHES.get(normalized_raw)
    if mapped_title:
        normalized_raw = normalize_title(mapped_title)

    best_title: Title | None = None
    best_score = 0.0

    for title in titles:
        normalized_title = normalize_title(title.title)
        if normalized_title == normalized_raw:
            best_title = title
            best_score = 1.0
            break
        score = difflib.SequenceMatcher(None, normalized_raw, normalized_title).ratio()
        if score > best_score:
            best_score = score
            best_title = title

    if best_score < threshold:
        logger.warning(
            "title_resolver.low_confidence",
            raw_title=raw_title,
            score=best_score,
            matched_title=best_title.title if best_title else None,
        )

    if not best_title:
        return ResolvedTitle(None, None, None, None, best_score)

    return ResolvedTitle(
        matched_title=best_title.title,
        track=best_title.track,
        level=best_title.level,
        expertise_code=best_title.expertise_code,
        confidence=best_score,
    )


async def resolve_title(
    raw_title: str, session: AsyncSession, threshold: float = DEFAULT_THRESHOLD
) -> ResolvedTitle:
    result = await session.execute(select(Title))
    titles = list(result.scalars().all())
    return resolve_title_from_titles(raw_title, titles, threshold)
