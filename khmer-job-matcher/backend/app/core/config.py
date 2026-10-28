from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    # No implicit database: migrations and seed require an explicit connection.
    database_url: str
    frontend_origin: str = 'http://localhost:5173'
    jwt_secret: SecretStr
    access_token_minutes: int = Field(default=30, ge=1, le=1440)
    smtp_host: str = ''
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_user: str = ''
    smtp_password: SecretStr = SecretStr('')
    smtp_from: str = ''
    smtp_starttls: bool = True
    smtp_ssl: bool = False
    rate_limit_enabled: bool = True
    ml_engine: Literal['auto', 'sklearn', 'builtin'] = 'auto'
    ml_model_dir: str = ''
    google_client_id: str = ''
    google_client_secret: SecretStr = SecretStr('')
    facebook_app_id: str = ''
    facebook_app_secret: SecretStr = SecretStr('')
    # Set the version shown in your Meta app dashboard; do not guess a version.
    facebook_graph_version: str = ''
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    @field_validator('jwt_secret')
    @classmethod
    def validate_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value().encode('utf-8')) < 32:
            raise ValueError('JWT_SECRET must contain at least 32 bytes; generate a random secret')
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
