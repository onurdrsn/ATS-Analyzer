# Project: Open-Source ATS Resume & Job-Match Analyzer (Phase 2 & Phase 3)

## Architecture
The system is structured as a polyrepo microservice architecture consisting of 5 distinct repositories:
1. **`contracts/` (`@ats-analyzer/contracts`)**: Source of truth for all shared Zod schemas, TypeScript types, validation constraints, and interface contracts across all services.
2. **`ats-api/`**: Core backend REST API service built on Hono (`@hono/node-server` and Cloudflare Workers compatible), PostgreSQL (via Drizzle ORM), Workers AI / local heuristic fallback, and document export engines.
3. **`ats-job-fetcher/`**: Isolated SSRF-protected web scraper using JSDOM and Mozilla Readability for parsing job posting URLs into clean text, with strict IP/scheme validation and zero exemptions.
4. **`ats-web/`**: Modern Single Page Application (SPA) built with React 19, Vite, Tailwind CSS 4, and Zustand, supporting full bilingual UI (TR/EN), batch job inputs, side-by-side comparison, and accessible diff review.
5. **`ats-deploy/`**: Container orchestration manifests (Docker Compose), local build definitions, SigNoz + OTel Collector observability profile, and automated cross-repo E2E verification suites.

### Data Flow
- **Job Ingestion**: Web Client -> API Gateway (`ats-api`) -> URL fetch delegator (`ats-job-fetcher` with SSRF validation) -> Readability text extraction.
- **Analysis & Scoring**: `ats-api` extracts structured requirements (Bilingual prompt: English / Turkish Kariyer.net) -> computes composite score + 4 sub-scores (keyword match, format & parseability, experience fit, section completeness) against structured resume.
- **Batch Processing**: Up to 5 jobs per session evaluated in parallel/batch, consuming proportional rate limit quota.
- **AI Gap-Closing**: Suggests non-fabricating bullet rewrites with inline Approve / Edit / Reject controls.
- **Bilingual Export**: Downloads structured resume as ATS-safe PDF, DOCX, or LaTeX (`.tex`) in English or Turkish.
- **Observability**: OTLP traces, metrics, logs exported to OTel Collector / SigNoz (disabled/local by default for self-hosted privacy).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Shared Language Schemas | Zod enum for `'en' \| 'tr'` with inferred types | M1 | R1, survey_1 |
| 2 | Bilingual Resume Schema | Dual-language resume structure with localized sections | M1 | R1, survey_1 |
| 3 | Batch Comparison Schemas | Request & response schemas for 1-5 jobs batch comparison | M1 | R1, survey_1 |
| 4 | Export Schemas | Validation schemas for export formats (`pdf`, `docx`, `tex`) | M1 | R1, survey_1 |
| 5 | Contracts Compilation & Types | TypeScript `dist/` compilation and type exports (`export type ...`) | M1 | R1, survey_1 |
| 6 | Contracts Unit Test Suite | Test suite verifying all contract schemas and validation rules | M1 | R1, survey_1 |
| 7 | UI Internationalization | Full Turkish and English i18n support in `ats-web` with switcher | M2 | R2, survey_2 |
| 8 | Bilingual Extraction Prompts | Turkish (Kariyer.net) & English prompt parsing & heuristic fallbacks | M2 | R2, survey_1 |
| 9 | Bilingual Resume Export Engine | Generation of valid PDF, DOCX, and LaTeX (`.tex`) in TR and EN | M2 | R2, survey_1, survey_2 |
| 10 | Multi-Job Batch Comparison API | `POST /api/analyze/batch` handling 1-5 jobs with side-by-side scores | M3 | R3, survey_1 |
| 11 | Strict 5-Job Cap Enforcement | Reject batch requests with >5 jobs with 400 Bad Request | M3 | R3, survey_1, survey_3 |
| 12 | Proportional Rate Limiting | Rate limiter quota consumes tokens equal to batch job count | M3 | R3, survey_1, survey_3 |
| 13 | SSRF Zero-Exemption Protection | Strict IP & scheme validation blocking loopback, private, link-local IPs | M3 | R3, survey_2, survey_3 |
| 14 | Multi-Job UI Comparison Matrix | Side-by-side sub-scores display in `ats-web` for up to 5 jobs | M3 | R3, survey_2 |
| 15 | OpenTelemetry SDK in ats-api | OpenTelemetry instrumentation for traces, metrics, and logs | M4 | R4, survey_1 |
| 16 | OpenTelemetry in ats-job-fetcher | OpenTelemetry instrumentation in job fetcher service | M4 | R4, survey_2 |
| 17 | Self-Hosted Privacy by Default | OTLP exporting disabled/local by default with zero outbound PII | M4 | R4, survey_1, survey_3 |
| 18 | SigNoz & OTel Compose Profile | `make docker-up-observability` profile in `ats-deploy/docker-compose.yml` | M4 | R4, survey_3 |
| 19 | OpenAPI 3.1 & Swagger UI | `@hono/zod-openapi` specs at `/api-docs` derived from contracts | M5 | R5, survey_1 |
| 20 | WCAG 2.1 AA Keyboard Navigation | Tab, Enter, Space keyboard control for gap-closing diff actions | M5 | R5, survey_2 |
| 21 | WCAG 2.1 AA Color Contrast | Accessible contrast ratios (>= 4.5:1) across all `ats-web` controls | M5 | R5, survey_2 |
| 22 | Docker Compose Local Build Setup | `build:` directives & healthchecks for clean local container builds | M6 | R6, survey_3 |
| 23 | Cross-Repo E2E Test Suite | End-to-end verification script for bilingual export & batch comparison | M6 | R6, survey_3 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | R1: Contracts Package (@ats-analyzer/contracts) | Language schema, bilingual resume schema, batch comparison schemas, export schemas, type exports, unit tests, dist build | none | DONE |
| M2 | R2: Internationalization & Bilingual Export | `ats-web` i18n switcher, `ats-api` bilingual prompt extraction & heuristic, PDF/DOCX/LaTeX export generators | M1 | DONE |
| M3 | R3: Batch Comparison & Rate Limits | `ats-api` batch endpoint, 5-job cap, proportional rate limiter, `ats-job-fetcher` SSRF zero-exemption validation, `ats-web` side-by-side UI | M1, M2 | IN_PROGRESS |
| M4 | R4: Observability & Monitoring | OTel SDK in `ats-api` and `ats-job-fetcher`, privacy toggle defaults, SigNoz + OTel Collector profile in `ats-deploy` | M1 | PLANNED |
| M5 | R5: OpenAPI 3.1 & Accessibility | `ats-api` OpenAPI 3.1 via `@hono/zod-openapi` with Swagger UI at `/api-docs`, `ats-web` WCAG 2.1 AA keyboard nav and contrast | M1, M2, M3 | PLANNED |
| M6 | R6: Cross-Repo E2E Integration Verification | Docker Compose local builds, healthchecks, and complete E2E verification test suite (export formats, batch comparison, 5-job cap, SSRF) | M1, M2, M3, M4, M5 | PLANNED |

---

## Interface Contracts

### contracts ↔ ats-api & ats-web
- **Language**:
  ```ts
  export const LanguageSchema = z.enum(['en', 'tr']);
  export type Language = z.infer<typeof LanguageSchema>;
  ```
- **Batch Analysis Request**:
  ```ts
  export const BatchJobItemSchema = z.object({
    jobUrl: z.string().url().optional(),
    jobText: z.string().optional(),
  }).refine(data => data.jobUrl || data.jobText, {
    message: "Either jobUrl or jobText must be provided",
  });
  export const BatchAnalysisRequestSchema = z.object({
    resumeData: ResumeStructureSchema,
    language: LanguageSchema.default('en'),
    jobs: z.array(BatchJobItemSchema).min(1).max(5),
  });
  export type BatchAnalysisRequest = z.infer<typeof BatchAnalysisRequestSchema>;
  ```
- **Batch Analysis Response**:
  ```ts
  export const BatchAnalysisResultItemSchema = z.object({
    jobIndex: z.number(),
    jobTitle: z.string(),
    company: z.string().optional(),
    overallScore: z.number().min(0).max(100),
    subScores: SubScoresSchema,
    matchedSkills: z.array(z.string()),
    missingSkills: z.array(z.string()),
    gaps: z.array(z.any()),
  });
  export const BatchAnalysisResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(BatchAnalysisResultItemSchema),
    totalJobs: z.number(),
  });
  export type BatchAnalysisResponse = z.infer<typeof BatchAnalysisResponseSchema>;
  ```
- **Export Request**:
  ```ts
  export const ExportFormatSchema = z.enum(['pdf', 'docx', 'tex']);
  export type ExportFormat = z.infer<typeof ExportFormatSchema>;
  export const ExportResumeRequestSchema = z.object({
    resumeData: ResumeStructureSchema,
    format: ExportFormatSchema,
    language: LanguageSchema.default('en'),
  });
  export type ExportResumeRequest = z.infer<typeof ExportResumeRequestSchema>;
  ```

### ats-api ↔ ats-job-fetcher
- **Single URL Fetch**: `POST http://ats-job-fetcher:3001/api/fetch-job`
  - Body: `{ "url": "https://example.com/job" }`
  - Response: `{ "title": "Job Title", "text": "Job description text", "siteName": "Domain" }`
  - SSRF Error: `403 Forbidden` (`{ "error": "Access to private/internal network address is forbidden" }`)
- **Health**: `GET http://ats-job-fetcher:3001/api/health` -> `{ "status": "ok" }`

---

## Code Layout
- `contracts/`:
  - `src/schemas/language.schema.ts`
  - `src/schemas/resume.schema.ts`
  - `src/schemas/job.schema.ts`
  - `src/schemas/analysis.schema.ts`
  - `src/schemas/batch.schema.ts`
  - `src/schemas/export.schema.ts`
  - `src/index.ts`
  - `tests/`
- `ats-api/`:
  - `src/index.ts`
  - `src/lib/export/` (PDF, DOCX, LaTeX generators)
  - `src/lib/scoring.ts`
  - `src/lib/ai.ts`
  - `src/lib/telemetry.ts`
  - `src/routes/`
  - `tests/`
- `ats-job-fetcher/`:
  - `src/index.ts`
  - `src/telemetry.ts`
  - `tests/`
- `ats-web/`:
  - `src/i18n/` (translations for en/tr)
  - `src/components/` (BatchComparison, DiffControls, LanguageSwitcher, etc.)
  - `src/lib/export.ts`
  - `tests/`
- `ats-deploy/`:
  - `docker-compose.yml`
  - `docker-compose.observability.yml`
  - `Makefile`
  - `scripts/verify-e2e.sh`
