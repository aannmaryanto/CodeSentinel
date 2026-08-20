from app.config import settings


def test_settings_initialization():
    assert settings.APP_NAME == "CodeSentinel"
    assert isinstance(settings.CORS_ORIGINS, list)
    assert len(settings.CORS_ORIGINS) > 0
    assert "postgresql" in settings.DATABASE_URL
