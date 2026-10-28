from pydantic import BaseModel, Field, field_validator

from app.schemas.auth import StrictInput
from app.schemas.jobs import SkillOut


class ProfileOut(BaseModel):
    id: int
    name: str
    education: str
    interests: str
    skills: list[SkillOut]
    experience: str = ''
    preferred_location: str = ''
    preferred_category: str = ''


class ProfilePatch(StrictInput):
    name: str = Field(default='', max_length=80)
    education: str = Field(default='', max_length=160)
    interests: str = Field(default='', max_length=1000)
    experience: str = Field(default='', max_length=2000)
    preferred_location: str = Field(default='', max_length=100)
    preferred_category: str = Field(default='', max_length=80)
    skill_ids: list[int] = Field(default_factory=list, max_length=100)

    @field_validator('name')
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Name cannot be blank')
        return value.strip()

    @field_validator('skill_ids')
    @classmethod
    def unique_skills(cls, value: list[int]) -> list[int]:
        if any(item < 1 for item in value) or len(value) != len(set(value)):
            raise ValueError('Skill IDs must be positive and unique')
        return value
