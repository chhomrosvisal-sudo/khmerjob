from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


ApplicationStatus = Literal['submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected']


class AdminOverview(BaseModel):
    users: int = Field(ge=0)
    students: int = Field(ge=0)
    employers: int = Field(ge=0)
    jobs: int = Field(ge=0)
    open_jobs: int = Field(ge=0)
    applications: int = Field(ge=0)
    skills: int = Field(ge=0)
    pending_employers: int = Field(ge=0)
    statuses: dict[str, int]


class AdminApplication(BaseModel):
    id: int
    applicant_id: int
    applicant_name: str
    applicant_email: str
    job_id: int
    job_title: str
    company_name: str
    status: str
    created_at: datetime
    is_demo: bool


class AdminApplicationPage(BaseModel):
    items: list[AdminApplication]
    total: int
    page: int
    page_size: int


class MonthlyCount(BaseModel):
    month: str
    count: int = Field(ge=0)


class NamedCount(BaseModel):
    name: str
    count: int = Field(ge=0)


class PlatformActivity(BaseModel):
    label: str
    record_id: int
    created_at: datetime
    path: str


class DashboardAnalytics(BaseModel):
    start: date
    end: date
    students: int = Field(ge=0)
    employers: int = Field(ge=0)
    verified_companies: int = Field(ge=0)
    active_jobs: int = Field(ge=0)
    applications: int = Field(ge=0)
    ai_matches: int | None
    pending_jobs: int | None
    pending_employers: int = Field(ge=0)
    student_registrations: list[MonthlyCount]
    job_postings: list[MonthlyCount]
    application_statuses: list[NamedCount]
    top_skills: list[NamedCount]
    activities: list[PlatformActivity]
    notes: list[str]
