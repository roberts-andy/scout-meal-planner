from __future__ import annotations

import sys
from types import ModuleType

import pytest

from app import main as main_mod


@pytest.mark.asyncio
async def test_lifespan_closes_app_config_provider_and_avoids_unused_refresh_setting(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APPCONFIG_ENDPOINT", "https://example.azconfig.io")

    class _FakeProvider:
        def __init__(self):
            self.closed = False

        def close(self):
            self.closed = True

    provider = _FakeProvider()
    load_kwargs: dict[str, object] = {}
    initialized_provider = []

    def fake_load(**kwargs):
        load_kwargs.update(kwargs)
        return provider

    class FakeSettingSelector:
        def __init__(self, key_filter: str):
            self.key_filter = key_filter

    class FakeDefaultAzureCredential:
        pass

    azure_module = ModuleType("azure")
    appconfig_module = ModuleType("azure.appconfiguration")
    provider_module = ModuleType("azure.appconfiguration.provider")
    identity_module = ModuleType("azure.identity")
    provider_module.load = fake_load
    provider_module.SettingSelector = FakeSettingSelector
    identity_module.DefaultAzureCredential = FakeDefaultAzureCredential
    monkeypatch.setitem(sys.modules, "azure", azure_module)
    monkeypatch.setitem(sys.modules, "azure.appconfiguration", appconfig_module)
    monkeypatch.setitem(sys.modules, "azure.appconfiguration.provider", provider_module)
    monkeypatch.setitem(sys.modules, "azure.identity", identity_module)

    async def fake_init_database():
        return None

    async def fake_close_database_clients():
        return None

    monkeypatch.setattr(main_mod, "init_database", fake_init_database)
    monkeypatch.setattr(main_mod, "close_database_clients", fake_close_database_clients)
    monkeypatch.setattr(main_mod, "init_app_config", initialized_provider.append)

    async with main_mod.lifespan(main_mod.app):
        pass

    assert initialized_provider == [provider]
    assert provider.closed is True
    assert load_kwargs["feature_flag_enabled"] is True
    assert "feature_flag_refresh_enabled" not in load_kwargs
