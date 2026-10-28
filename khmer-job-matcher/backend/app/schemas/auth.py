from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator


class StrictInput(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Credentials(StrictInput):
    email: EmailStr = Field(max_length=254)
    password: SecretStr = Field(min_length=12, max_length=128)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=80)

    @field_validator('name')
    @classmethod
    def trim_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Name cannot be blank')
        return value.strip()


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    expires_in: int
