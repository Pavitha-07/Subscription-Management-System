"""Phase 0 gate: authenticate, read one partner, create + delete a test partner.

Run from repo root:  python backend/scripts/odoo_smoke.py   (or inside the web container)
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from integrations.odoo.client import get_client  # noqa: E402

c = get_client()
print("version :", c.version().get("server_version"))
print("uid     :", c.uid)
print("partner :", c.search_read("res.partner", [], ["name", "email"], limit=1))
pid = c.create("res.partner", {"name": "Smoke Test Partner"})
print("created :", pid)
c.unlink("res.partner", [pid])
print("deleted :", pid, "-> OK")
