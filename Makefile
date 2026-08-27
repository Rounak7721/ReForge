# Reforge — task shortcuts.
#
# `make` on its own lists every target. Each target's help text is the `##`
# comment beside its name, so the list cannot drift from the targets.

SHELL := /bin/bash
.DEFAULT_GOAL := help

COMPOSE := docker compose
PNPM    := pnpm

.PHONY: help install dev build lint types check verify seed \
        docker-build docker-up docker-down docker-restart docker-logs \
        docker-sh docker-ps clean nuke env

help: ## List every target
	@echo "Reforge — make targets"
	@echo
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "  Local:  make install && make env && make dev"
	@echo "  Docker: make env && make docker-up"

# --- local ------------------------------------------------------------------

install: ## Install dependencies
	$(PNPM) install

dev: ## Run the dev server on http://localhost:3000
	$(PNPM) dev

build: ## Production build
	$(PNPM) build

lint: ## ESLint
	$(PNPM) lint

types: ## TypeScript, no emit
	npx tsc --noEmit

check: ## The four assert-based self-checks
	$(PNPM) check

verify: lint types check build ## Every gate, in the order that fails cheapest first
	@echo
	@echo "All gates green. Safe to commit and push."

seed: ## Reset the demo account. Makes ZERO model calls
	$(PNPM) seed:demo

# --- docker -----------------------------------------------------------------

docker-build: ## Build the image
	$(COMPOSE) build

docker-up: ## Build if needed, then start on http://localhost:3000
	$(COMPOSE) up -d --build
	@echo
	@echo "Waiting for the container to report healthy..."
	@for i in $$(seq 1 30); do \
	  status=$$($(COMPOSE) ps --format '{{.Health}}' web 2>/dev/null); \
	  case "$$status" in \
	    healthy) echo "  healthy -> http://localhost:$${PORT:-3000}"; exit 0 ;; \
	    unhealthy) echo "  unhealthy. Run: make docker-logs"; exit 1 ;; \
	  esac; \
	  sleep 2; \
	done; \
	echo "  still starting. Run: make docker-logs"

docker-down: ## Stop and remove the container
	$(COMPOSE) down

docker-restart: ## Restart. Use after changing a SERVER-only variable
	$(COMPOSE) restart web
	@echo "Note: changing a NEXT_PUBLIC_* value needs 'make docker-build', not a restart."

docker-logs: ## Follow the container logs
	$(COMPOSE) logs -f web

docker-sh: ## Open a shell inside the running container
	$(COMPOSE) exec web sh

docker-ps: ## Show the container and its health
	$(COMPOSE) ps

# --- housekeeping -----------------------------------------------------------

env: ## Create .env from .env.example if it does not exist
	@if [ -f .env ]; then \
	  echo ".env already exists. Leaving it alone."; \
	else \
	  cp .env.example .env; \
	  echo "Created .env from .env.example. Fill in the values before running."; \
	fi

clean: ## Remove local build output
	rm -rf .next out tsconfig.tsbuildinfo

nuke: clean ## clean, plus node_modules and the docker image
	rm -rf node_modules
	-$(COMPOSE) down --rmi local --volumes --remove-orphans
