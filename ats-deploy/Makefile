.PHONY: dev build test db-migrate docker-up docker-up-observability docker-down

dev:
	@echo "Run 'npm run dev' inside the individual service repositories (ats-api, ats-web, ats-job-fetcher) for standalone development."

build:
	@echo "Builds are handled by GHCR actions in each repo, but you can build locally by running 'docker build' in the respective repo."

test:
	@echo "Run 'npm test' inside the individual service repositories."

db-migrate:
	@echo "Run 'npm run db:migrate' inside the ats-api repository."

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-up-observability:
	docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
