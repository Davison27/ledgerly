SHELL := /bin/bash

DEPLOY_ENV := deploy/.env
DEPLOY_COMPOSE := docker compose -f deploy/docker-compose.yml --env-file $(DEPLOY_ENV)

DEV_ENV_FILE := apps/back/.env
DEV_ENV_EXAMPLE := apps/back/.env.example
DEV_COMPOSE := docker compose --project-name ledgerly-dev -f apps/back/docker-compose.yml --env-file $(DEV_ENV_FILE)

SERVICE ?=
FILE ?=

# Contextual: production when deploy/.env exists; otherwise development Postgres.
ifneq (,$(wildcard $(DEPLOY_ENV)))
MODE := production
COMPOSE := $(DEPLOY_COMPOSE)
DEV_PREREQ :=
else
MODE := development
COMPOSE := $(DEV_COMPOSE)
DEV_PREREQ := _check-tools
endif

.DEFAULT_GOAL := help

.PHONY: help setup doctor configure update up down restart logs dev build lint \
	typecheck test migrate baseline-existing-db rehearse-existing-db-baseline reset-db seed clean _check-tools

help:
	@echo "Ledgerly — available commands (current mode: $(MODE))"
	@echo ""
	@echo "Installation (server)"
	@echo "  make setup       Guided interactive installation. Cannot be run twice."
	@echo "  make doctor      Diagnoses the installation; fails if anything is wrong."
	@echo "  make configure   Changes the domain, Google credentials, admin, or database password."
	@echo ""
	@echo "Updates"
	@echo "  make update      Fetches the latest version, rebuilds images, and migrates without data loss."
	@echo ""
	@echo "Lifecycle (contextual: production when deploy/.env exists; otherwise development Postgres)"
	@echo "  make up          Starts the stack."
	@echo "  make down        Stops the stack."
	@echo "  make restart     Restarts the stack."
	@echo "  make logs        Follows logs; SERVICE=<name> filters a service."
	@echo ""
	@echo "Development"
	@echo "  make dev         Local loop: dependencies, Postgres, migrations, and 'pnpm dev'."
	@echo "  make build       Builds frontend and backend."
	@echo "  make lint        Runs ESLint."
	@echo "  make typecheck   Checks types."
	@echo "  make test        Runs tests."
	@echo ""
	@echo "Database (contextual unless noted)"
	@echo "  make migrate     Applies pending migrations."
	@echo "  make baseline-existing-db  Records the initial migration after a verified rehearsal."
	@echo "  make rehearse-existing-db-baseline  Tests the existing-database cutover on a disposable clone."
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
