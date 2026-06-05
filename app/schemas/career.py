from pydantic import BaseModel, ConfigDict, Field


class ExpertiseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    group: str
    segment: str
    enable: bool


class TitleUpdate(BaseModel):
    desc: str | None = None
    general_requirement: str | None = None
    exp_requirement: str | None = None

class NodeSchema(BaseModel):
    id: str
    db_id: int | None = None
    track: str
    level: int
    title: str
    active: bool
    desc: str | None = None
    general_requirement: str | None = None
    exp_requirement: str | None = None


class EdgeSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_node: str = Field(alias="from")
    to: str
    type: str


class CareerPathResponse(BaseModel):
    expertise: ExpertiseSchema
    nodes: list[NodeSchema]
    edges: list[EdgeSchema]
