from functools import lru_cache
from pathlib import Path

import pandas as pd
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expertise import Expertise, Title
from app.schemas.career import CareerPathResponse, EdgeSchema, ExpertiseSchema, NodeSchema

logger = structlog.get_logger()

TRACK_ORDER: list[tuple[str, list[int]]] = [
    ("Trainee", [1]),
    ("Intern", [1]),
    ("Professional", [1, 2, 3, 4, 5]),
    ("Management", [3, 4, 5]),
    ("Leadership", [4, 5, 6]),
]

EXPERTISE_GRID_COLUMN_MAP: dict[str, tuple[str, int]] = {
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


def parse_ceiling(ceiling: str | None, fallback_flag: str | None) -> int:
    if ceiling and ceiling.startswith("L"):
        return int(ceiling[1:])
    if fallback_flag:
        if fallback_flag.endswith("5"):
            return 5
        if fallback_flag.endswith("3"):
            return 3
        if fallback_flag.endswith("2"):
            return 2
    return 5


def format_fallback_title(track: str, level: int) -> str:
    if track in {"Trainee", "Intern"}:
        return track
    return f"{track} L{level}"


def resolve_expertise_grid_path() -> Path:
    data_dir = Path(__file__).resolve().parents[2] / "app" / "seed" / "data"
    csv_path = data_dir / "expertise_grid.csv"
    xlsx_path = data_dir / "expertise_grid.xlsx"
    if csv_path.exists():
        return csv_path
    return xlsx_path


@lru_cache(maxsize=1)
def load_expertise_grid_titles() -> dict[str, dict[tuple[str, int], str]]:
    data_path = resolve_expertise_grid_path()
    if data_path.suffix.lower() == ".xlsx":
        df = pd.read_excel(data_path)
    else:
        df = pd.read_csv(data_path, encoding="utf-8-sig")

    results: dict[str, dict[tuple[str, int], str]] = {}
    for _, row in df.iterrows():
        code = str(row.get("Code", "")).strip()
        if not code:
            continue
        title_map: dict[tuple[str, int], str] = {}
        for col, key in EXPERTISE_GRID_COLUMN_MAP.items():
            value = row.get(col)
            if pd.isna(value):
                continue
            title = str(value).strip()
            if not title:
                continue
            title_map[key] = title
        results[code] = title_map

    return results


async def build_career_path(
    expertise_code: str, session: AsyncSession
) -> CareerPathResponse:
    result = await session.execute(
        select(Expertise).where(Expertise.code == expertise_code)
    )
    expertise = result.scalar_one_or_none()
    if expertise is None:
        raise ValueError(f"Expertise not found: {expertise_code}")

    title_rows = await session.execute(
        select(Title).where(
            (Title.expertise_code == expertise_code) | (Title.expertise_code.is_(None))
        )
    )
    titles = title_rows.scalars().all()

    title_map: dict[tuple[str, int], str] = {}
    shared_map: dict[tuple[str, int], str] = {}
    title_obj_map: dict[tuple[str, int], Title] = {}
    shared_obj_map: dict[tuple[str, int], Title] = {}
    grid_title_map = load_expertise_grid_titles().get(expertise_code, {})
    
    for title in titles:
        key = (title.track, title.level)
        if title.expertise_code:
            title_map[key] = title.title
            title_obj_map[key] = title
        elif key not in shared_map:
            shared_map[key] = title.title
            shared_obj_map[key] = title

    has_trainee = expertise.flag.startswith("TI") if expertise.flag else False
    ceiling_level = parse_ceiling(expertise.ceiling_prof, expertise.flag)

    nodes: list[NodeSchema] = []
    node_ids: dict[tuple[str, int], str] = {}

    for track, levels in TRACK_ORDER:
        for level in levels:
            key = (track, level)
            title = title_map.get(key) or grid_title_map.get(key) or shared_map.get(key)
            has_title = title is not None
            
            # Find the actual Title object to extract description fields
            # Since we only mapped strings in title_map earlier, we should map Title objects.
            title_obj = title_obj_map.get(key) or shared_obj_map.get(key)
            
            if not title:
                title = format_fallback_title(track, level)

            # A node is active if it's a Trainee and the expertise allows it,
            # or if it's a defined title for the expertise.
            # Shared titles (like CEO) are active if they exist.
            active = False
            if track == "Trainee":
                if has_trainee:
                    active = True
            elif key in title_map or key in grid_title_map:
                # This is a title specific to the expertise (from DB or grid fallback)
                if track == "Professional" and level <= ceiling_level:
                    active = True
                elif track in {"Intern", "Management", "Leadership"}:
                    active = True
            elif key in shared_map:
                # This is a shared title (e.g., CEO, Head of Division)
                active = True

            # Special rule for Leadership L4: must be an expertise-specific title
            if track == "Leadership" and level == 4 and key not in title_map and key not in grid_title_map:
                active = False

            node_id = f"{track.lower()}-{level}"
            node_ids[key] = node_id
            
            db_id = title_obj.id if title_obj else None
            desc = title_obj.desc if title_obj else None
            gen_req = title_obj.general_requirement if title_obj else None
            exp_req = title_obj.exp_requirement if title_obj else None
            
            nodes.append(
                NodeSchema(
                    id=node_id,
                    db_id=db_id,
                    track=track,
                    level=level,
                    title=title,
                    active=active,
                    desc=desc,
                    general_requirement=gen_req,
                    exp_requirement=exp_req,
                )
            )

    edges: list[EdgeSchema] = []

    def add_edge(from_key: tuple[str, int], to_key: tuple[str, int], edge_type: str) -> None:
        from_id = node_ids.get(from_key)
        to_id = node_ids.get(to_key)
        if not from_id or not to_id:
            return
        
        # Ensure both nodes are active before adding an edge
        from_node_active = any(n.id == from_id and n.active for n in nodes)
        to_node_active = any(n.id == to_id and n.active for n in nodes)

        if from_node_active and to_node_active:
            edges.append(EdgeSchema(from_node=from_id, to=to_id, type=edge_type))

    active_nodes = {(n.track, n.level) for n in nodes if n.active}
    pro_levels = sorted(lvl for trk, lvl in active_nodes if trk == "Professional")
    mgmt_levels = sorted(lvl for trk, lvl in active_nodes if trk == "Management")

    # Sequence within tracks
    for track_name, _ in TRACK_ORDER:
        levels = sorted([lvl for trk, lvl in active_nodes if trk == track_name])
        for i in range(len(levels) - 1):
            # Find the next available level in the sorted list
            current_level = levels[i]
            next_level = levels[i+1]
            add_edge((track_name, current_level), (track_name, next_level), "up")

    # Cross-track edges
    if has_trainee and ("Intern", 1) in active_nodes:
        add_edge(("Trainee", 1), ("Intern", 1), "up")

    if ("Intern", 1) in active_nodes and pro_levels:
        add_edge(("Intern", 1), ("Professional", pro_levels[0]), "up")

    # Connect Professional to Management
    if pro_levels and mgmt_levels:
        # Find the highest professional level <= 3
        pro_branch_candidates = [lvl for lvl in pro_levels if lvl <= 3]
        if pro_branch_candidates:
            pro_branch_level = max(pro_branch_candidates)
            add_edge(
                ("Professional", pro_branch_level),
                ("Management", mgmt_levels[0]),
                "branch",
            )

    # Connect Management to Leadership
    if ("Management", 3) in active_nodes and ("Leadership", 4) in active_nodes:
        # Check if the Leadership L4 title is specific to the expertise
        if title_map.get(("Leadership", 4)) or grid_title_map.get(("Leadership", 4)):
            add_edge(("Management", 3), ("Leadership", 4), "branch")

    # Bi-directional connection between Management L5 and Leadership L5
    if ("Management", 5) in active_nodes and ("Leadership", 5) in active_nodes:
        add_edge(("Management", 5), ("Leadership", 5), "bidirectional")
        
    # Connect Head of Division to CEO
    if ("Leadership", 5) in active_nodes and ("Leadership", 6) in active_nodes:
        add_edge(("Leadership", 5), ("Leadership", 6), "up")

    response = CareerPathResponse(
        expertise=ExpertiseSchema(
            code=expertise.code,
            name=expertise.name,
            group=expertise.group_name,
            segment=expertise.segment,
            enable=expertise.enable,
        ),
        nodes=nodes,
        edges=edges,
    )

    logger.info("career_path.built", expertise_code=expertise_code, node_count=len(nodes))
    return response
