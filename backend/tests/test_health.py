import pytest


@pytest.mark.django_db
def test_healthz_with_odoo_disabled(client, settings):
    settings.ODOO_ENABLED = False
    r = client.get("/api/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "app_db": "ok", "odoo": {"status": "disabled"}}
