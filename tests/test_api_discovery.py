"""Milestone 3 — Repository Scanner tests.

Verifies that the repository scanner correctly discovers SDK dependencies,
base URLs, endpoints, client calls, and type references in the demo-checkout fixture.
"""

from pathlib import Path
import pytest

from packages.repository_analyzer.scanner import scan_repository
from packages.repository_analyzer.models import UsageType

DEMO_REPO = Path(__file__).parent / "fixtures" / "demo-repository"


@pytest.fixture(scope="module")
def scan_result():
    return scan_repository(DEMO_REPO)


class TestProviderAndDependencyDiscovery:
    def test_discovers_fakepay_provider(self, scan_result):
        assert "fakepay" in scan_result.providers

    def test_discovers_fakepay_sdk_dependency(self, scan_result):
        dep_names = {d.name for d in scan_result.dependencies}
        assert "fakepay-sdk" in dep_names

    def test_discovers_axios_http_client(self, scan_result):
        dep_names = {d.name for d in scan_result.dependencies}
        assert "axios" in dep_names


class TestUrlAndConfigDiscovery:
    def test_discovers_fakepay_base_url_in_config(self, scan_result):
        url_usages = [
            u for u in scan_result.usages
            if u.usage_type == UsageType.BASE_URL_CONFIG
        ]
        assert len(url_usages) >= 1
        config_url = next(
            (u for u in url_usages if "config.ts" in u.file_path), None
        )
        assert config_url is not None
        assert "api.fakepay.dev/v1" in (config_url.symbol or config_url.snippet or "")
        assert config_url.provider == "fakepay"
        assert config_url.confidence >= 0.9


class TestEndpointAndClientUsageDiscovery:
    def test_discovers_payment_endpoint_in_client(self, scan_result):
        endpoint_usages = scan_result.usages_for_endpoint("/payment")
        assert len(endpoint_usages) >= 1
        post_usage = next(
            (u for u in endpoint_usages if u.method == "POST" and "fakepay-client.ts" in u.file_path),
            None
        )
        assert post_usage is not None
        assert post_usage.file_path == "src/fakepay-client.ts"
        assert post_usage.usage_type == UsageType.ENDPOINT_CALL

    def test_discovers_get_payment_by_id_endpoint_in_client(self, scan_result):
        endpoint_usages = scan_result.usages_for_endpoint("/payment/{id}")
        assert len(endpoint_usages) >= 1
        get_usage = next(
            (u for u in endpoint_usages if u.method == "GET" and "fakepay-client.ts" in u.file_path),
            None
        )
        assert get_usage is not None
        assert get_usage.file_path == "src/fakepay-client.ts"
        assert get_usage.usage_type == UsageType.ENDPOINT_CALL

    def test_discovers_client_call_in_checkout(self, scan_result):
        client_calls = [
            u for u in scan_result.usages
            if u.usage_type == UsageType.CLIENT_METHOD_CALL and "checkout.ts" in u.file_path
        ]
        assert len(client_calls) >= 1
        create_call = next(
            (u for u in client_calls if u.symbol == "createPayment"), None
        )
        assert create_call is not None
        assert create_call.file_path == "src/checkout.ts"

    def test_discovers_imports(self, scan_result):
        import_usages = [
            u for u in scan_result.usages
            if u.usage_type == UsageType.IMPORT
        ]
        assert len(import_usages) >= 1
        files_with_imports = {u.file_path for u in import_usages}
        assert any("checkout.ts" in f or "index.ts" in f for f in files_with_imports)

    def test_discovers_type_references(self, scan_result):
        type_usages = [
            u for u in scan_result.usages
            if u.usage_type == UsageType.TYPE_REFERENCE
        ]
        assert len(type_usages) >= 1
        symbols = {u.symbol for u in type_usages}
        assert any("Payment" in str(s) for s in symbols)


class TestInventoryIntegrity:
    def test_fakepay_usage_inventory_is_non_empty(self, scan_result):
        fakepay_usages = scan_result.usages_for_provider("fakepay")
        assert len(fakepay_usages) >= 5

    def test_serialization_to_dict(self, scan_result):
        data = scan_result.to_dict()
        assert "repository_path" in data
        assert "providers" in data
        assert "dependencies" in data
        assert "usages" in data
        assert isinstance(data["usages"], list)
