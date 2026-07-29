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

# Contextual: producción si existe deploy/.env, si no el Postgres de desarrollo.
ifneq (,$(wildcard $(DEPLOY_ENV)))
MODE := producción
COMPOSE := $(DEPLOY_COMPOSE)
DEV_PREREQ :=
else
MODE := desarrollo
COMPOSE := $(DEV_COMPOSE)
DEV_PREREQ := _check-tools
endif

.DEFAULT_GOAL := help

.PHONY: help setup doctor configure update up down restart logs dev build lint \
	typecheck test migrate backup restore reset-db seed clean _check-tools

help:
	@echo "Ledgerly — comandos disponibles (modo actual: $(MODE))"
	@echo ""
	@echo "Instalación (servidor)"
	@echo "  make setup       Instalación interactiva y guiada. No se puede repetir."
	@echo "  make doctor      Diagnostica la instalación; falla si algo va mal."
	@echo "  make configure   Cambia dominio, credenciales de Google, admin o contraseña de la BD."
	@echo ""
	@echo "Actualización y copias"
	@echo "  make update      Trae la versión nueva, reconstruye imágenes y migra sin perder datos."
	@echo "  make backup      Copia de seguridad de la base de datos."
	@echo "  make restore     Restaura una copia (pide confirmación escrita)."
	@echo ""
	@echo "Ciclo de vida (contextual: producción si existe deploy/.env, si no el Postgres de desarrollo)"
	@echo "  make up          Levanta la pila."
	@echo "  make down        La para."
	@echo "  make restart     La reinicia."
	@echo "  make logs        Sigue los logs; SERVICE=<nombre> filtra un servicio."
	@echo ""
	@echo "Desarrollo"
	@echo "  make dev         Bucle local: deps, Postgres, migraciones y 'pnpm dev'."
	@echo "  make build       Compila front y back."
	@echo "  make lint        ESLint."
	@echo "  make typecheck   Comprueba tipos."
	@echo "  make test        Tests."
	@echo ""
	@echo "Base de datos (contextual salvo aviso)"
	@echo "  make migrate     Aplica migraciones pendientes."
	@echo "  make reset-db    Borra el volumen y recrea la BD. Solo desarrollo."
	@echo "  make seed        Datos de ejemplo. Solo desarrollo."
	@echo ""
	@echo "Limpieza"
	@echo "  make clean       Limpia builds, node_modules y volúmenes de desarrollo. Se niega en producción."

_check-tools:
	@command -v docker >/dev/null 2>&1 || { echo "✗ Docker no encontrado. Instala Docker Desktop: https://www.docker.com/products/docker-desktop"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "✗ Docker no está en ejecución. Abre Docker Desktop e inténtalo de nuevo."; exit 1; }

setup:
	@bash deploy/scripts/setup.sh

doctor:
	@bash deploy/scripts/doctor.sh

configure:
	@bash deploy/scripts/configure.sh

update:
	@bash deploy/scripts/update.sh

up: $(DEV_PREREQ)
	@echo "→ Modo: $(MODE)"
ifeq ($(MODE),producción)
	$(COMPOSE) up -d --wait
else
	@if [ ! -f $(DEV_ENV_FILE) ]; then \
		cp $(DEV_ENV_EXAMPLE) $(DEV_ENV_FILE); \
		echo "✓ Creado $(DEV_ENV_FILE) a partir de .env.example"; \
	fi
	$(COMPOSE) up -d --wait
endif

down: $(DEV_PREREQ)
	@echo "→ Modo: $(MODE)"
	$(COMPOSE) down

restart: $(DEV_PREREQ)
	@echo "→ Modo: $(MODE)"
	$(COMPOSE) restart

logs: $(DEV_PREREQ)
	@echo "→ Modo: $(MODE)"
	$(COMPOSE) logs -f $(SERVICE)

dev: _check-tools
	pnpm install
	@if [ ! -f $(DEV_ENV_FILE) ]; then \
		cp $(DEV_ENV_EXAMPLE) $(DEV_ENV_FILE); \
		echo "✓ Creado $(DEV_ENV_FILE) a partir de .env.example"; \
	fi
	$(DEV_COMPOSE) up -d --wait
	pnpm --filter @ledgerly/back run migration:run
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

migrate: $(DEV_PREREQ)
	@echo "→ Modo: $(MODE)"
ifeq ($(MODE),producción)
	$(COMPOSE) --profile tools run --rm migrator
else
	pnpm --filter @ledgerly/back run migration:run
endif

backup: $(DEV_PREREQ)
	@echo "→ Modo: $(MODE)"
ifeq ($(MODE),producción)
	@bash deploy/scripts/backup.sh
else
	@mkdir -p deploy/backups
	@ts=$$(date -u +%Y%m%dT%H%M%SZ); \
	file=deploy/backups/ledgerly-dev-$$ts.dump; \
	$(COMPOSE) exec -T postgres pg_dump -U $(DEV_DB_USER) -Fc $(DEV_DB_NAME) > $$file; \
	chmod 600 $$file; \
	echo "✓ Copia guardada en $$file"
endif

restore: $(DEV_PREREQ)
	@echo "→ Modo: $(MODE)"
ifeq ($(MODE),producción)
	@bash deploy/scripts/restore.sh $(FILE)
else
	@file="$(FILE)"; \
	if [ -z "$$file" ]; then file=$$(ls -t deploy/backups/ledgerly-dev-*.dump 2>/dev/null | head -1); fi; \
	if [ -z "$$file" ]; then echo "✗ No hay copias en deploy/backups/. Indica una con FILE=ruta"; exit 1; fi; \
	echo "Esto sobrescribe la base de datos de desarrollo con $$file"; \
	read -p "Escribe RESTAURAR para continuar: " confirm; \
	[ "$$confirm" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }; \
	$(COMPOSE) exec -T postgres pg_restore --clean --if-exists -U $(DEV_DB_USER) -d $(DEV_DB_NAME) < "$$file"; \
	echo "✓ Restaurado desde $$file"
endif

reset-db: $(DEV_PREREQ)
ifeq ($(MODE),producción)
	@echo "✗ reset-db no está disponible en producción (borraría datos reales)."; exit 1
else
	$(COMPOSE) down -v
	@$(MAKE) up
	@$(MAKE) migrate
endif

seed:
ifeq ($(MODE),producción)
	@echo "✗ seed no está disponible en producción."; exit 1
else
	pnpm --filter @ledgerly/back run seed
endif

clean:
ifeq ($(MODE),producción)
	@echo "✗ clean no está disponible en producción (borraría volúmenes)."; exit 1
else
	-$(COMPOSE) down -v
	pnpm clean
endif
