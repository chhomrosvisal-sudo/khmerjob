from datetime import datetime
from typing import Literal
from pydantic import BaseModel
from app.schemas.auth import StrictInput
from app.schemas.jobs import JobOut


class ModelMetadata(BaseModel):
    version: str
    engine: str
    library_version: str | None
    trained_at: datetime
    fingerprint: str
    document_count: int
    feature_count: int


class MatchComponents(BaseModel):
    skill_coverage: float
    text_similarity: float
    location_match: bool
    category_match: bool


class TextSignal(BaseModel):
    text: str
    contribution: float


class MatchResult(BaseModel):
    job_id: int
    score: float
    matched_skills: list[str]
    missing_skills: list[str]
    learning_topics: list[str]
    components: MatchComponents
    weighted_points: dict[str, float]
    text_signals: list[TextSignal]
    job: JobOut


class MatchPage(BaseModel):
    items: list[MatchResult]
    total: int
    page: int
    page_size: int
    engine: str
    formula: str
    limitations: str
    model: ModelMetadata
    profile_ready: bool


class TrainRequest(StrictInput):
    engine: Literal['auto', 'builtin', 'sklearn'] = 'auto'
