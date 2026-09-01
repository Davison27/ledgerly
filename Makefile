SHELL := /bin/bash

DEPLOY_ENV := deploy/.env
DEPLOY_COMPOSE := docker compose -f deploy/docker-compose.yml --env-file $(DEPLOY_ENV)

DEV_ENV_FILE := apps/back/.env
DEV_ENV_EXAMPLE := apps/back/.env.example
DEV_COMPOSE := docker compose --project-name ledgerly-dev -f apps/back/docker-compose.yml --env-file $(DEV_ENV_FILE)

SERVICE ?=
FILE ?=

MODE ?= development

ifneq ($(filter development production,$(MODE)),$(MODE))
$(error Invalid MODE='$(MODE)'. Use MODE=development or MODE=production)
endif

PRODUCTION_ONLY_TARGETS := setup doctor configure update build-production baseline-existing-db rehearse-existing-db-baseline
REQUESTED_PRODUCTION_TARGETS := $(filter $(PRODUCTION_ONLY_TARGETS),$(MAKECMDGOALS))
ifneq ($(strip $(REQUESTED_PRODUCTION_TARGETS)),)
ifneq ($(MODE),production)
$(error Target(s) $(REQUESTED_PRODUCTION_TARGETS) require MODE=production)
endif
endif

export MODE

ifeq ($(MODE),production)
COMPOSE := $(DEPLOY_COMPOSE)
DEV_PREREQ :=
else
COMPOSE := $(DEV_COMPOSE)
DEV_PREREQ := _check-tools
endif

.DEFAULT_GOAL := help

.PHONY: help setup doctor configure update build-production up down restart logs dev build lint \
	typecheck test migrate baseline-existing-db rehearse-existing-db-baseline reset-db seed clean _check-tools

help:
	@echo "Ledgerly — available commands (current mode: $(MODE))"
	@echo "Set MODE=development (default) or MODE=production explicitly."
	@echo ""
	@echo "Installation (server)"
	@echo "  make MODE=production setup      Guided interactive installation. Cannot be run twice."
	@echo "  make MODE=production doctor     Diagnoses the installation; fails if anything is wrong."
	@echo "  make MODE=production configure  Changes the domain, Google credentials, admin, or database password."
	@echo ""
	@echo "Updates"
	@echo "  make MODE=production update     Fetches the latest version, rebuilds images, and migrates without data loss."
	@echo ""
	@echo "Lifecycle (development by default; production requires MODE=production)"
	@echo "  make up          Starts the development stack."
	@echo "  make down        Stops the development stack."
	@echo "  make restart     Restarts the development stack."
	@echo "  make logs        Follows development logs; SERVICE=<name> filters a service."
	@echo "  make MODE=production up       Starts the production stack."
	@echo "  make MODE=production down     Stops the production stack."
	@echo "  make MODE=production restart  Restarts the production stack."
	@echo "  make MODE=production logs     Follows production logs; SERVICE=<name> filters a service."
	@echo ""
	@echo "Development"
	@echo "  make dev         Local loop: dependencies, Postgres, migrations, and 'pnpm dev'."
	@echo "  make build       Builds frontend and backend."
	@echo "  make lint        Runs ESLint."
	@echo "  make typecheck   Checks types."
	@echo "  make test        Runs tests."
	@echo ""
	@echo "Database"
	@echo "  make migrate     Applies development migrations."
	@echo "  make MODE=production migrate  Applies production migrations."
	@echo "  make MODE=production build-production  Builds ledgerly-back:local for the production stack."
	@echo "  make MODE=production baseline-existing-db  Records the initial migration after a verified rehearsal."
	@echo "  make MODE=production rehearse-existing-db-baseline FILE=/path/to/dump  Tests an existing-database cutover on a disposable clone."
	@echo "  make reset-db CONFIRM=RESET_LEDGERLY_DEV  Inspects and recreates only the guarded local development database."
	@echo "  make seed        Sample data. Development only."
	@echo ""
	@echo "Cleanup"
	@echo "  make clean       Cleans builds and node_modules while preserving PostgreSQL volumes."

_check-tools:
	@command -v docker >/dev/null 2>&1 || { echo "✗ Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "✗ Docker is not running. Open Docker Desktop and try again."; exit 1; }

setup:
	@bash deploy/scripts/setup.sh

doctor:
	@bash deploy/scripts/doctor.sh

configure:
	@bash deploy/scripts/configure.sh

update:
	@bash deploy/scripts/update.sh

build-production:
	@echo "→ Mode: $(MODE)"
	$(COMPOSE) build back

up: $(DEV_PREREQ)
	@echo "→ Mode: $(MODE)"
ifeq ($(MODE),production)
	$(COMPOSE) up -d --wait
else
	@if [ ! -f $(DEV_ENV_FILE) ]; then \
		cp $(DEV_ENV_EXAMPLE) $(DEV_ENV_FILE); \
		echo "✓ Created $(DEV_ENV_FILE) from .env.example"; \
	fi
	$(COMPOSE) up -d --wait
endif

down: $(DEV_PREREQ)
	@echo "→ Mode: $(MODE)"
	$(COMPOSE) down

restart: $(DEV_PREREQ)
	@echo "→ Mode: $(MODE)"
	$(COMPOSE) restart

logs: $(DEV_PREREQ)
	@echo "→ Mode: $(MODE)"
	$(COMPOSE) logs -f $(SERVICE)

dev: _check-tools
	pnpm install
	@if [ ! -f $(DEV_ENV_FILE) ]; then \
		cp $(DEV_ENV_EXAMPLE) $(DEV_ENV_FILE); \
		echo "✓ Created $(DEV_ENV_FILE) from .env.example"; \
	fi
	$(DEV_COMPOSE) up -d --build postgres
	$(DEV_COMPOSE) run --rm back node dist/database/migrate.js --mode=auto
	$(DEV_COMPOSE) up -d --build --wait back
	VITE_BACKEND_URL=http://localhost:3005 pnpm --filter @ledgerly/front dev

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

migrate: $(DEV_PREREQ)
	@echo "→ Mode: $(MODE)"
ifeq ($(MODE),production)
	$(COMPOSE) --profile tools run --rm migrator
else
	pnpm --filter @ledgerly/back run db:migrate
endif

baseline-existing-db:
	@LEDGERLY_EXISTING_DB_CUTOVER=1 bash deploy/scripts/baseline-existing-db.sh

rehearse-existing-db-baseline:
	@bash deploy/scripts/rehearse-existing-db-baseline.sh FILE=$(FILE)

reset-db:
	@CONFIRM="$(CONFIRM)" DRY_RUN="$(DRY_RUN)" node scripts/reset-development-database.mjs

seed:
ifeq ($(MODE),production)
	@echo "✗ seed is not available in production."; exit 1
else
	pnpm --filter @ledgerly/back run seed
endif

clean:
	pnpm clean
