"""
TraceShield – Configuration & Settings
All settings are loaded from environment variables (or a .env file).
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_ENV_FILE = os.path.join(_BASE_DIR, ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_ENV_FILE, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # AI Model
    hf_api_token: str = ""
    hf_model_id: str = "Qwen/Qwen2.5-1.5B-Instruct"
    qlora_adapter_path: str = ""

    # Search API
    tavily_api_key: str = ""

    # Intelligence API
    news_api_key: str = ""

    # Server
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def hf_available(self) -> bool:
        return bool(self.hf_api_token and self.hf_api_token.strip())

    @property
    def tavily_available(self) -> bool:
        return bool(self.tavily_api_key and self.tavily_api_key.strip())

    @property
    def news_available(self) -> bool:
        return bool(self.news_api_key and self.news_api_key.strip())


settings = Settings()
