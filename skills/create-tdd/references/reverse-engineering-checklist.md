# Reverse-Engineering Mode: artifact → section map

When documenting an existing codebase's *actual* implemented state (rather than a prospective
design), don't explore aimlessly -- these are the concrete artifacts that answer each TDD section.
Read what exists; if an artifact is missing, that's itself worth noting in the relevant section
(e.g. "no health-check endpoint found") rather than silently skipping it.

| TDD section | Look at |
|---|---|
| **System Architecture** | `package.json`/lockfiles or equivalent manifest (runtime, framework), `Dockerfile`/`docker-compose.yml`, entrypoint files, routing/controller layout, service-to-service client code (HTTP clients, gRPC stubs, message-bus producers/consumers) |
| **Data Models** | Schema/migration files (`migrations/`, `prisma/schema.prisma`, `*.sql`), ORM model definitions, API request/response schemas (OpenAPI/JSON Schema/Zod/Pydantic) |
| **Security** | Auth middleware/guards, `.env.example` (which secrets exist, never their values), IAM/role config, CORS config, dependency-injected secrets managers |
| **Resource Considerations** | IaC (`terraform/`, `k8s/` manifests, `serverless.yml`, CDK/Pulumi), autoscaling config, resource limits/requests in deploy manifests |
| **Monitoring & Observability** | Logging/metrics library imports, `/health` or `/ready` endpoints, dashboard-as-code (Grafana JSON, Datadog monitors), alerting config |
| **Testing Strategy** | Test directory layout and naming convention, CI config (`.github/workflows/`, `.gitlab-ci.yml`), coverage thresholds in config, existing test types present (unit/integration/e2e) |
| **Deployment Plan** | CI/CD pipeline definitions, deploy scripts, environment-specific config files, documented rollback procedure (runbooks, `docs/`) |
| **External Dependencies & Impacts** | Third-party SDK imports, API client configs, webhook handlers, shared-database connection strings pointing outside this service |

Cross-check what's found against the repo's own docs (`README.md`, `AGENTS.md`/`CONTRIBUTING.md`,
`docs/`) -- a documented convention and what's actually implemented can diverge; when they do, the
TDD should describe the *actual* implemented state and flag the divergence, not just restate the
docs.
