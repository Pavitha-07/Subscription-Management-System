.PHONY: up down logs migrate seed seed-big test billing notify perf odoo-init frontend-dev build

DC = docker compose
RUN = $(DC) exec web

up:            ; $(DC) up -d --build
down:          ; $(DC) down
logs:          ; $(DC) logs -f --tail=100 web odoo
migrate:       ; $(RUN) python manage.py migrate --noinput
seed:          ; $(RUN) python scripts/seed_demo.py
seed-big:      ; $(RUN) python scripts/seed_demo.py --big
test:          ; $(RUN) pytest -q
billing:       ; $(RUN) python manage.py run_billing
notify:        ; $(RUN) python manage.py run_notifications
perf:          ; $(RUN) python scripts/perf_check.py

# One-time: create the Odoo DB with the accounting modules, then set India/INR + chart of accounts.
odoo-init:
	$(DC) run --rm odoo odoo -d odoo_sub -i base,contacts,account,sale_management --without-demo=all --stop-after-init
	$(DC) up -d odoo
	$(RUN) python scripts/odoo_bootstrap.py
	$(RUN) python scripts/odoo_smoke.py

frontend-dev:  ; cd frontend && npm run dev
build:         ; $(DC) build web
