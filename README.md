# Brightloop — Subscription Management

React + Django REST API + Odoo 18 (accounting ledger). Plans, quotations, subscriptions, automatic idempotent billing, discounts,
payments, finance dashboard, email/WhatsApp notifications. Built phase by phase from [KICKOFF.md](KICKOFF.md).

**Status:** Phase 0 (bootstrap) — see [TASKS.md](TASKS.md) for what is done, cut, and broken.

## Quick start (Docker)
```bash
cp .env.example .env
docker compose up -d --build        # web :8000, odoo :8069, postgres x2
make odoo-init                      # one-time Odoo DB + India/INR + smoke test (needs Odoo up)
make seed                           # demo data (from Phase 1)
```
Open http://localhost:8000 (the built SPA and the API share one origin).

## Quick start (local dev, no Docker)
```bash
# backend (Python 3.10+ ; sqlite fallback if DATABASE_URL is unset — see D-029)
cd backend && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python manage.py migrate && .venv\Scripts\python manage.py runserver
# frontend (second terminal)
cd frontend && npm install && npm run dev     # http://localhost:5173, proxies /api to :8000
```
Set `ODOO_ENABLED=false` in `.env` to run without Odoo.

## URLs
| What | URL |
|---|---|
| App (prod build) | http://localhost:8000 |
| Frontend dev | http://localhost:5173 |
| Health | http://localhost:8000/api/healthz |
| Django admin | http://localhost:8000/admin/ |
| Odoo | http://localhost:8069 (db `odoo_sub`, login `admin` / `admin`) |

## Demo logins (after `seed`, from Phase 1)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo` | `Demo@12345` |
| Staff | `staff@demo` | `Demo@12345` |
| Customer | `customer@demo` | `Demo@12345` |

## Everyday commands
| Task | Command |
|---|---|
| Tests | `cd backend && python -m pytest -q` (or `make test` in Docker) |
| Run billing | `python manage.py run_billing` (Phase 4) |
| Reminders | `python manage.py run_notifications` (Phase 7) |
| Perf gate | `python scripts/perf_check.py` (Phase 8) |
| Odoo smoke | `python backend/scripts/odoo_smoke.py` |

Docs: [PRD](docs/PRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Data model](docs/DATA_MODEL.md) · [State machines](docs/STATE_MACHINES.md) ·
[Billing engine](docs/BILLING_ENGINE.md) · [Odoo](docs/ODOO_INTEGRATION.md) · [RBAC](docs/RBAC.md) · [API](docs/API.md) ·
[Frontend](docs/FRONTEND.md) · [Notifications](docs/NOTIFICATIONS.md) · [Test plan](docs/TEST_PLAN.md) · [Demo script](docs/DEMO_SCRIPT.md) · [Decisions](docs/DECISIONS.md)

## Known limitations
- Odoo has **not** been brought up or verified yet (Docker's engine did not start on the first dev machine — D-030; the compose file is untested); mappings in `docs/ODOO_INTEGRATION.md` are unverified.
- WhatsApp sandbox reaches only pre-joined numbers; production needs a verified business account and approved templates.
- Single currency (INR); payments are recorded manually; no proration.
