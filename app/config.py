from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./cassor_hrm.db"
    log_level: str = "INFO"

    # Comma-separated list of allowed CORS origins, e.g.
    # "https://your-app.vercel.app,http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Payment settings
    payment_bank_name: str = "MB Bank"
    payment_bank_account: str = "0909090909"
    payment_bank_account_name: str = "CASSOR HRM"
    payment_amount_vnd: int = 3000
    payment_webhook_secret: str = "cassor-webhook-secret-change-me"
    payment_file_expiry_seconds: int = 1800

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=False,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
