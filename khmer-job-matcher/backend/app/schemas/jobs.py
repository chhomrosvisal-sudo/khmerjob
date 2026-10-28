from pydantic import BaseModel, ConfigDict
from typing import Literal
from pydantic import Field, field_validator, model_validator
from app.schemas.auth import StrictInput
from datetime import datetime


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    name_km: str | None


class RequirementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    skill: SkillOut
    required: bool
    proficiency: str


class EmployerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_demo: bool


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    location: str
    job_type: str
    is_demo: bool
    employer: EmployerOut
    requirements: list[RequirementOut]
    created_at: datetime
    is_active: bool = True
    category: str = 'other'
    experience_level: str = 'Not specified'
    salary_min: int | None = None
    salary_max: int | None = None


class JobPage(BaseModel):
    items: list[JobOut]
    total: int
    page: int
    page_size: int


class RequirementInput(StrictInput):
    skill_id: int = Field(gt=0)
    required: bool = True
    proficiency: Literal['beginner', 'intermediate', 'advanced'] = 'beginner'


class JobCreate(StrictInput):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=10000)
    location: str = Field(min_length=1, max_length=100)
    job_type: Literal['Full-time', 'Part-time', 'Internship', 'Contract']
    requirements: list[RequirementInput] = Field(default_factory=list, max_length=100)
    category: str = Field(default='other', max_length=80)
    experience_level: str = Field(default='Not specified', max_length=80)
    salary_min: int | None = Field(default=None, ge=0, le=1000000)
    salary_max: int | None = Field(default=None, ge=0, le=1000000)

    @model_validator(mode='after')
    def salary_order(self):
        if self.salary_min is not None and self.salary_max is not None and self.salary_max < self.salary_min:
            raise ValueError('Maximum salary must be at least the minimum salary')
        return self

    @field_validator('title', 'description', 'location')
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Value cannot be blank')
        return value.strip()

    @field_validator('requirements')
    @classmethod
    def unique_requirements(cls, value: list[RequirementInput]) -> list[RequirementInput]:
        ids = [item.skill_id for item in value]
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate skill requirements')
        return value


class JobPatch(JobCreate):
    # Only explicitly provided fields are applied by the route.
    title: str = Field(default='', max_length=160)
    description: str = Field(default='', max_length=10000)
    location: str = Field(default='', max_length=100)
    job_type: Literal['Full-time', 'Part-time', 'Internship', 'Contract'] = 'Full-time'

    @model_validator(mode='after')
    def nonempty(self):
        if not self.model_fields_set:
            raise ValueError('Provide at least one field to update')
        return self
