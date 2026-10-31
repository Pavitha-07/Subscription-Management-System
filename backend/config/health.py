from django.conf import settings
from django.db import connection
from django.http import JsonResponse

from integrations.odoo.client import OdooError, get_client


def health(request):
    db = "ok"
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
    except Exception:
        db = "down"

    odoo = {"status": "disabled"}
    if settings.ODOO_ENABLED:
        try:
            c = get_client()
            odoo = {"status": "ok", "version": c.version().get("server_version"), "uid": c.uid}
        except OdooError as e:
            odoo = {"status": "down", "error": str(e)[:200]}

    ok = db == "ok" and odoo["status"] in ("ok", "disabled")
    return JsonResponse(
        {"status": "ok" if ok else "degraded", "app_db": db, "odoo": odoo},
        status=200 if db == "ok" else 503,
    )
