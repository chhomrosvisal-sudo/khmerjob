from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.jobs import JobOut


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    created_at: datetime
    job: JobOut
    resume_id: int | None = None


class ApplicationPage(BaseModel):
    items: list[ApplicationOut]
    total: int
    page: int
    page_size: int
