# Master Build Prompt: Open-Source ATS Resume & Job-Match Analyzer

Paste this whole document into your AI coding agent (Claude Code, etc.) as the project brief. It is written as an instruction set for that agent — "you" below refers to the agent/developer building the system, not the end user.

---

## 1. Role & Objective

You are building a **free, open-source, self-hostable** web application that helps job seekers:
1. Score how well their resume matches a specific job posting, the way an ATS would.
2. See exactly which hard skills, soft skills, and technologies are missing.
3. Close those gaps with AI-assisted rewrites — without fabricating experience the user doesn't have.
4. Export a clean, ATS-safe resume in the format they need (PDF, DOCX, or LaTeX).

Reference product: `resumematcher.fyi` (open source, hosted demo + self-hostable via Docker). Match that dual-deployment philosophy, but go further on job-posting-URL ingestion, skill taxonomy, and AI-assisted fixing.

## 2. Core Principles (non-negotiable)

1. **Always free.** No paywall, no monthly scan cap, no feature gated behind "premium." If compute cost becomes a real constraint, rate-limit generously (e.g. per session/day) rather than charging.
2. **Two deployment modes, one codebase.**
   - Hosted: instantly usable at a public URL, no signup required for a basic scan.
   - Self-hosted: `docker compose up` or `wrangler dev`, so privacy-conscious users can run it entirely on their own infra with zero data leaving their machine.
3. **Score transparency, not a black box.** Never show a single opaque 0–100 number and stop there. Always break it into sub-scores (keyword/skill match, format & parseability, experience-level fit, section completeness) and show exactly why points were gained or lost per category. Do not imply that ATS platforms auto-reject at a fixed score threshold — that's a common myth; real corporate ATS (Workday, Taleo, SuccessFactors) don't work that way.
4. **Never fabricate.** When the AI suggests a fix for a missing skill, it must never silently insert a skill or technology the user hasn't stated they have. It can only:
   - rephrase/surface something the user already wrote but stated weakly, or
   - clearly flag the gap as a genuine gap ("you don't have this — remove it from consideration, or note it as something you're learning").
   Any generated bullet must be traceable back to something the user actually entered.
5. **No dark patterns.** Never suggest hidden white-text keyword stuffing or any trick that games ATS parsing while misleading a human reader. If the tool detects this in an uploaded resume, warn the user.
6. **Privacy by default.** Resume and job-posting content are not retained beyond the session unless the user explicitly opts to save them.

## 3. Tech Stack

Use this stack unless there's a concrete reason not to — it matches a proven multi-tenant Cloudflare pattern already used across this developer's other projects (PDFusion Cloud, ChronaMesh, NexusERP):

- **Edge runtime:** Cloudflare Workers
- **API layer:** Hono (type-safe routing + middleware chain)
- **Session/analysis state:** Durable Objects — one DO per analysis session, mirroring the per-tenant DO isolation pattern
- **Persistent storage:** D1 via Drizzle ORM — templates, optional saved analyses, rate-limit counters (atomic, as in the existing quota pattern)
- **File storage:** R2 — for uploaded resume files (PDF/DOCX) when not processed purely in-memory
- **AI inference:** Cloudflare Workers AI
  - Free tier: **10,000 Neurons/day per account**, resets 00:00 UTC, no card required, covers hosted open-source models (Llama 3.3 70B, Mistral 7B, DeepSeek, etc.). Budget prompts accordingly — use smaller/cheaper models for extraction, reserve larger ones for the gap-fix rewrite step.
  - Self-hosted fallback: optional local Ollama endpoint (`OLLAMA_BASE_URL` env var) for users without a Cloudflare account, same pattern Resume Matcher uses.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Zustand
- **Export:** PDF (server-side render), DOCX, and **LaTeX** (`.tex` output — don't skip this; it matters for technical users maintaining LaTeX resumes)

## 4. User Flow

1. **Resume input** — upload PDF/DOCX, paste raw text, or start from one of the system's ATS-safe templates.
2. **Job posting input** — paste a URL or paste raw text directly.
   - URL path: server-side fetch + content extraction (strip nav/ads/footer, keep the description body). If extraction confidence is low (JS-rendered page, login wall, blocked fetch), tell the user and ask them to paste the text instead — don't silently guess.
3. **Job posting analysis** — extract and categorize requirements (see §5.C taxonomy).
4. **Persona detection** — infer the target role's seniority + domain ("mid-level backend engineer" vs. "corporate PM" vs. "startup generalist") and recommend the closest-fitting template from the library, or let the user keep their own resume as-is.
5. **Match & score** — compare resume against posting, produce the category-broken-down score plus a concrete matched/missing list per category.
6. **AI-assisted gap closing** — for each real, fixable gap, offer an AI-drafted rewrite (Workers AI call), grounded only in what the user already entered (§2.4). User reviews and approves/edits/rejects each suggestion inline — nothing is auto-applied.
7. **Export** — PDF, DOCX, or `.tex`, using either a system template or the user's own uploaded resume structure.

## 5. Feature Spec Detail

### A. Resume Input
- Accept PDF, DOCX, and plain text paste.
- Parse into a structured JSON (contact, summary, experience[], projects[], skills[], education[], languages[]) — this structure is what every downstream step (scoring, rewriting, export) operates on, not raw text.
- If parsing confidence is low (e.g. complex multi-column PDF), flag which sections may need manual review rather than silently guessing.

### B. Job Posting Input & URL Parsing
- Raw text: pass directly to extraction.
- URL: fetch server-side, run through a readability-style extractor. Handle common job board shapes (LinkedIn, Indeed, Kariyer.net, generic company career pages) as known patterns, with a generic fallback extractor for anything else.
- Explicitly detect and message: paywalled/login-required pages, JS-only rendered pages, and dead links — each gets a distinct, honest error state, not a fake result.

### C. Skill Extraction & Categorization (core feature)
Extract from the job posting into this taxonomy:
- **Hard skills** (domain knowledge/methodologies — e.g. "RESTful API design", "database normalization")
- **Soft skills** (e.g. "organizational skills", "cross-functional communication", "attention to detail")
- **Technology/tool skills** (named languages, frameworks, platforms — e.g. "React", "PostgreSQL", ".NET")
- Secondary fields: required years of experience, degree/certification requirements, language requirements, seniority level

Run the same categorization on the resume's structured JSON, then diff the two sets per category.

Sample Workers AI extraction prompt (adapt per model):
```
You are extracting structured requirements from a job posting.
Return strict JSON with keys: hard_skills[], soft_skills[], tech_skills[],
years_experience_required (number|null), degree_requirement (string|null),
language_requirements[], seniority_level (string).
Do not infer skills that are not explicitly stated or clearly implied by
an explicitly named responsibility. If a list item is ambiguous, omit it
rather than guessing.

Job posting:
"""
{job_posting_text}
"""
```

### D. ATS Scoring Engine
Composite score built from independently visible sub-scores, e.g.:
- Keyword/skill match rate (weighted: tech skills > hard skills > soft skills, since exact tech-keyword matches are what real ATS keyword filters check first)
- Format & parseability (single-column check, no tables in critical sections, standard section headers, selectable text not images)
- Experience-level fit (years required vs. years shown)
- Section completeness (contact info, dates, quantified achievements present)

Show each sub-score plus the specific missing items that caused deductions — never just the final number.

### E. AI-Assisted Gap Closing
For each missing/weak item:
- If the user's resume already contains relevant-but-unlabeled experience, offer to rephrase a bullet to surface it explicitly (uses existing content only).
- If the user genuinely lacks the skill, say so plainly and optionally suggest it as a "skill to note as in-progress" or "consider before applying" rather than inserting it into the resume.
- Every suggestion is a diff the user approves, edits, or rejects — never an auto-write.

### F. Template System
- Ship a handful (3–6 to start) of ATS-safe templates: single-column, no tables in the parsed-text-critical areas, real hyperlinks (not just link text), standard fonts.
- Each template tagged with a target persona (e.g. "technical IC", "corporate/enterprise", "creative/design-adjacent") so persona detection (§4.4) can recommend one.
- User can always bypass templates and use their own uploaded resume as the base for export.

### G. Export
- PDF and DOCX via standard server-side rendering.
- `.tex` export: keep the LaTeX source clean and directly compilable (no exotic packages beyond what's commonly preinstalled on Overleaf/TeX Live), since technical users will want to keep iterating on it themselves.

## 6. Data Model (sketch)

```
resumes(id, session_id, raw_text, structured_json, source[upload|template|pasted], created_at)
job_postings(id, source_url?, raw_text, extracted_json, created_at)
analyses(id, resume_id, job_posting_id, score_breakdown_json, gaps_json, created_at)
templates(id, name, target_persona, tex_source, html_source, ats_safe boolean)
```

## 7. Self-Hosting Requirements
- `docker-compose up` (or `wrangler dev` for the Workers-native path) brings up the full stack locally.
- `.env.example` documents required keys: `CF_ACCOUNT_ID`, `CF_WORKERS_AI_TOKEN`, optional `OLLAMA_BASE_URL` fallback.
- README states plainly: in self-hosted mode, no resume or job-posting data leaves the user's own infrastructure.

## 8. Non-Goals (v1)
- No auto-apply / "Easy Apply" automation — URL fetching is for description-parsing only.
- No candidate marketplace or resume database/search features.
- No hidden-text or keyword-stuffing helpers, even if a user asks for them — actively warn against these instead.

## 9. Definition of Done (v1)
- [ ] Pasting a job URL correctly extracts the description for at least LinkedIn, Kariyer.net, and a generic company careers page, with an honest failure state for anything else.
- [ ] Score view shows 4+ independent sub-scores, never just one number.
- [ ] At least 3 ATS-safe templates ship, each mapped to a persona.
- [ ] Self-host mode runs end-to-end with zero paid external dependency (Workers AI free tier or local Ollama).
- [ ] Export produces valid, correctly formatted PDF, DOCX, and `.tex` output from the same underlying resume content.
- [ ] No AI-generated suggestion ever introduces a skill/technology absent from the user's original input.
