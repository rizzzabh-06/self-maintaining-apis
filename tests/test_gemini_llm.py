"""Unit tests for GeminiLLMProvider interface and bounded execution."""

import pytest
from packages.change_engine.models import APIChange, ChangeType
from packages.migration_engine.llm.gemini import GeminiLLMProvider


@pytest.fixture
def sample_change():
    return APIChange(
        type=ChangeType.ENDPOINT_RENAMED,
        breaking=True,
        description="POST /payment renamed to POST /payments",
        old_path="/payment",
        new_path="/payments",
        method="POST",
    )


class TestGeminiLLMProvider:
    def test_fallback_when_unconfigured(self, sample_change):
        # Without an API key, it should safely return fallback plan and patch
        provider = GeminiLLMProvider(api_key=None)
        assert provider.is_available() is False

        plan = provider.generate_plan(sample_change, {"provider": "fakepay", "affected_files": ["src/client.ts"]})
        assert isinstance(plan, list)
        assert len(plan) >= 3

        orig_code = 'const res = await http.post("/payment", data);'
        patch = provider.generate_patch("src/client.ts", orig_code, sample_change, {})
        assert patch == orig_code

        explanation = provider.explain_change(sample_change)
        assert "POST /payment renamed to POST /payments" in explanation

    def test_mock_gemini_interaction(self, sample_change, monkeypatch):
        # Test simulated Gemini response
        class MockGenerativeModel:
            def generate_content(self, prompt):
                class MockResponse:
                    text = '["1. Rename endpoint to /payments", "2. Update callers", "3. Run tests"]'
                return MockResponse()

        provider = GeminiLLMProvider(api_key="fake_test_key_gemini")
        provider._client = MockGenerativeModel()
        assert provider.is_available() is True

        plan = provider.generate_plan(sample_change, {"provider": "fakepay"})
        assert len(plan) == 3
        assert "Rename endpoint" in plan[0]
