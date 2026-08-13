SHELL := /bin/bash

DEPLOY_ENV := deploy/.env
DEPLOY_COMPOSE := docker compose -f deploy/docker-compose.yml --env-file $(DEPLOY_ENV)

DEV_ENV_FILE := apps/back/.env
DEV_ENV_EXAMPLE := apps/back/.env.example
DEV_COMPOSE := docker compose -f apps/back/docker-compose.yml --env-file $(DEV_ENV_FILE)
DEV_DB_USER := $(shell grep -m1 '^DB_USER=' $(DEV_ENV_FILE) 2>/dev/null | cut -d= -f2)
DEV_DB_USER := $(if $(DEV_DB_USER),$(DEV_DB_USER),ledgerly)
DEV_DB_NAME := $(shell grep -m1 '^DB_NAME=' $(DEV_ENV_FILE) 2>/dev/null | cut -d= -f2)
DEV_DB_NAME := $(if $(DEV_DB_NAME),$(DEV_DB_NAME),ledgerly)

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
	typecheck test migrate backup restore reset-db seed clean _check-tools

help:
	@echo "Ledgerly — available commands (current mode: $(MODE))"
	@echo ""
	@echo "Installation (server)"
	@echo "  make setup       Guided interactive installation. Cannot be run twice."
	@echo "  make doctor      Diagnoses the installation; fails if anything is wrong."
	@echo "  make configure   Changes the domain, Google credentials, admin, or database password."
	@echo ""
	@echo "Updates and backups"
	@echo "  make update      Fetches the latest version, rebuilds images, and migrates without data loss."
	@echo "  make backup      Database backup."
	@echo "  make restore     Restores a backup (requires typed confirmation)."
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
	@echo "  make reset-db    Deletes the volume and recreates the database. Development only."
	@echo "  make seed        Sample data. Development only."
	@echo ""
	@echo "Cleanup"
	@echo "  make clean       Cleans builds, node_modules, and development volumes. Refuses in production."

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
	$(DEV_COMPOSE) run --rm back node dist/database/bootstrap.js
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
	pnpm --filter @ledgerly/back run db:schema
endif

backup: $(DEV_PREREQ)
	@echo "→ Mode: $(MODE)"
ifeq ($(MODE),production)
	@bash deploy/scripts/backup.sh
else
	@mkdir -p deploy/backups
	@ts=$$(date -u +%Y%m%dT%H%M%SZ); \
	file=deploy/backups/ledgerly-dev-$$ts.dump; \
	$(COMPOSE) exec -T postgres pg_dump -U $(DEV_DB_USER) -Fc $(DEV_DB_NAME) > $$file; \
	chmod 600 $$file; \
	echo "✓ Backup saved to $$file"
endif

restore: $(DEV_PREREQ)
	@echo "→ Mode: $(MODE)"
ifeq ($(MODE),production)
	@bash deploy/scripts/restore.sh $(FILE)
else
	@file="$(FILE)"; \
	if [ -z "$$file" ]; then file=$$(ls -t deploy/backups/ledgerly-dev-*.dump 2>/dev/null | head -1); fi; \
	if [ -z "$$file" ]; then echo "✗ No backups found in deploy/backups/. Specify one with FILE=path"; exit 1; fi; \
	echo "This overwrites the development database with $$file"; \
	read -p "Type RESTORE to continue: " confirm; \
	[ "$$confirm" = "RESTORE" ] || { echo "Cancelled."; exit 1; }; \
	$(COMPOSE) exec -T postgres pg_restore --clean --if-exists -U $(DEV_DB_USER) -d $(DEV_DB_NAME) < "$$file"; \
	echo "✓ Restored from $$file"
endif

reset-db: $(DEV_PREREQ)
ifeq ($(MODE),production)
	@echo "✗ reset-db is not available in production (it would delete real data)."; exit 1
else
	$(COMPOSE) down -v
	@$(MAKE) up
	@$(MAKE) migrate
endif

seed:
ifeq ($(MODE),production)
	@echo "✗ seed is not available in production."; exit 1
else
	pnpm --filter @ledgerly/back run seed
endif

clean:
ifeq ($(MODE),production)
	@echo "✗ clean is not available in production (it would delete volumes)."; exit 1
else
	-$(COMPOSE) down -v
	pnpm clean
endif
