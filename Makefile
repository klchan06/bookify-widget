.PHONY: help dev build lint test clean docker-up docker-down db-push db-seed db-studio db-reset install

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	npm ci

dev: ## Start all packages in development mode
	npm run dev

build: ## Build all packages
	npm run build

lint: ## Lint all packages
	npm run lint

test: ## Run all tests
	npm run test

clean: ## Remove all build artifacts and node_modules
	rm -rf node_modules packages/*/node_modules packages/*/dist .turbo packages/*/.turbo

docker-up: ## Start all Docker services (db, mailhog, api)
	docker compose up -d

docker-down: ## Stop all Docker services
	docker compose down

docker-build: ## Rebuild Docker images
	docker compose build --no-cache

docker-logs: ## Follow Docker logs
	docker compose logs -f

db-push: ## Push Prisma schema to database
	npm run db:push

db-seed: ## Seed the database with sample data
	npm run db:seed

db-studio: ## Open Prisma Studio
	npm run db:studio

db-reset: ## Reset database (drop all data and re-push schema)
	cd packages/api && npx prisma db push --force-reset && npm run db:seed

format: ## Format all files with Prettier
	npx prettier --write "packages/*/src/**/*.{ts,tsx,json,css}"

format-check: ## Check formatting without writing
	npx prettier --check "packages/*/src/**/*.{ts,tsx,json,css}"

typecheck: ## Run TypeScript type checking across all packages
	npx turbo run lint
