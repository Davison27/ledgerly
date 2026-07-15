SHELL := /bin/bash

BACK_DIR := apps/back
ENV_FILE := $(BACK_DIR)/.env
ENV_EXAMPLE := $(BACK_DIR)/.env.example
COMPOSE := docker compose -f $(BACK_DIR)/docker-compose.yml --env-file $(ENV_FILE)
DB_CONTAINER := ledgerly-postgres
BACK_PORT := $(shell grep -m1 '^PORT=' $(ENV_FILE) 2>/dev/null | cut -d= -f2)
BACK_PORT := $(if $(BACK_PORT),$(BACK_PORT),3000)
FRONT_PORT := 5173

.DEFAULT_GOAL := up

.PHONY: help check-tools env install db-up db-down migrate seed setup free-ports dev up build lint typecheck test clean reset-db down logs

help:
	@echo "ledgerly-erp — comandos disponibles"
	@echo ""
	@echo "  make up        Instala deps, levanta la BD, migra y arranca front+back (todo en uno)"
	@echo "  make dev       Alias de 'make up'"
	@echo "  make setup     Prepara el entorno (install, .env, BD, migraciones) sin arrancar los servidores"
	@echo "  make free-ports Libera los puertos del back y front si quedaron ocupados"
	@echo "  make db-up     Levanta solo la base de datos"
	@echo "  make db-down   Para la base de datos (alias: make down)"
	@echo "  make migrate   Ejecuta las migraciones pendientes"
	@echo "  make seed      Carga datos de ejemplo"
	@echo "  make build     Compila front y back"
	@echo "  make lint      Ejecuta ESLint"
	@echo "  make typecheck Comprueba tipos"
	@echo "  make test      Ejecuta los tests"
	@echo "  make reset-db  Borra el volumen de la BD y la vuelve a crear + migrar"
	@echo "  make clean     Limpia builds, node_modules y volúmenes de Docker"
	@echo "  make logs      Sigue los logs de Postgres"

check-tools:
	@command -v node >/dev/null 2>&1 || { echo "✗ Node.js no encontrado. Instala Node >= 20: https://nodejs.org"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "✗ pnpm no encontrado. Instala con: corepack enable && corepack prepare pnpm@11.11.0 --activate"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "✗ Docker no encontrado. Instala Docker Desktop: https://www.docker.com/products/docker-desktop"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "✗ Docker no está en ejecución. Abre Docker Desktop e inténtalo de nuevo."; exit 1; }

env:
	@if [ ! -f $(ENV_FILE) ]; then \
		cp $(ENV_EXAMPLE) $(ENV_FILE); \
		echo "✓ Creado $(ENV_FILE) a partir de .env.example"; \
	fi

install: check-tools
	pnpm install

db-up: check-tools env
	$(COMPOSE) up -d
	@echo "Esperando a que Postgres esté listo..."
	@for i in $$(seq 1 30); do \
		status=$$(docker inspect --format='{{.State.Health.Status}}' $(DB_CONTAINER) 2>/dev/null || echo starting); \
		if [ "$$status" = "healthy" ]; then echo "✓ Postgres listo"; exit 0; fi; \
		sleep 1; \
	done; \
	echo "✗ Postgres no respondió a tiempo (30s)"; exit 1

db-down:
	$(COMPOSE) down

down: db-down

migrate:
	pnpm --filter @ledgerly/back run migration:run

seed:
	pnpm --filter @ledgerly/back run seed

setup: install db-up migrate
	@echo ""
	@echo "✓ Entorno listo."

free-ports:
	@for port in $(BACK_PORT) $(FRONT_PORT); do \
		pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null); \
		if [ -n "$$pids" ]; then \
			echo "⚠️  Puerto $$port ocupado por un proceso anterior (pid $$pids), liberando..."; \
			kill -9 $$pids 2>/dev/null || true; \
		fi; \
	done

dev: setup free-ports
	pnpm dev

up: dev

build: install
	pnpm build

lint: install
	pnpm lint

typecheck: install
	pnpm typecheck

test: install
	pnpm test

reset-db: check-tools env
	$(COMPOSE) down -v
	@$(MAKE) db-up
	@$(MAKE) migrate

clean:
	-$(COMPOSE) down -v
	pnpm clean

logs:
	$(COMPOSE) logs -f postgres
