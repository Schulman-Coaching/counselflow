# CounselFlow Makefile
# Convenient commands for development and deployment

.PHONY: help install dev build start test lint typecheck db-push db-studio docker-up docker-down clean

# Default target
help:
	@echo "CounselFlow Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install     - Install dependencies"
	@echo "  make dev         - Start development server"
	@echo "  make build       - Build for production"
	@echo "  make start       - Start production server"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test        - Run all tests"
	@echo "  make lint        - Run ESLint"
	@echo "  make typecheck   - Run TypeScript type check"
	@echo ""
	@echo "Database:"
	@echo "  make db-push     - Push schema to database"
	@echo "  make db-studio   - Open Drizzle Studio"
	@echo "  make db-generate - Generate migrations"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up   - Start all Docker services"
	@echo "  make docker-down - Stop all Docker services"
	@echo "  make docker-logs - View Docker logs"
	@echo "  make docker-build - Build Docker image"
	@echo ""
	@echo "Utilities:"
	@echo "  make setup       - Run initial setup"
	@echo "  make clean       - Clean build artifacts"

# ============================================
# Development
# ============================================

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

# ============================================
# Testing & Quality
# ============================================

test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

# ============================================
# Database
# ============================================

db-push:
	npm run db:push

db-studio:
	npm run db:studio

db-generate:
	npm run db:generate

# ============================================
# Docker
# ============================================

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-build:
	docker build -t counselflow:latest .

docker-clean:
	docker compose down -v --rmi local

# ============================================
# Utilities
# ============================================

setup:
	./scripts/setup-dev.sh

clean:
	rm -rf dist/
	rm -rf node_modules/.cache/
	rm -rf coverage/
	rm -rf .next/

# Generate session secret
session-secret:
	@openssl rand -base64 32

# Check if all required env vars are set
env-check:
	@echo "Checking environment variables..."
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL is not set" && exit 1)
	@echo "✓ DATABASE_URL is set"
	@echo "Environment check passed!"
