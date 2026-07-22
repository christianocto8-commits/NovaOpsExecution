"""Contract tests for offline/mobile connectivity helpers (web-side patterns)."""


def test_keep_alive_route_exists_in_web_app():
    from pathlib import Path

    route = Path(__file__).resolve().parents[2] / "web" / "app" / "api" / "keep-alive" / "route.ts"
    assert route.exists()
    content = route.read_text(encoding="utf-8")
    assert "/api/v1/health" in content


def test_service_worker_bootstrap_component_exists():
    from pathlib import Path

    bootstrap = Path(__file__).resolve().parents[2] / "web" / "components" / "ServiceWorkerBootstrap.tsx"
    assert bootstrap.exists()
    content = bootstrap.read_text(encoding="utf-8")
    assert "registerAppServiceWorker" in content


def test_offline_sync_provider_wires_online_status():
    from pathlib import Path

    provider = Path(__file__).resolve().parents[2] / "web" / "providers" / "OfflineSyncProvider.tsx"
    content = provider.read_text(encoding="utf-8")
    assert "useOnlineStatus" in content
    assert "processMutationQueue" in content
