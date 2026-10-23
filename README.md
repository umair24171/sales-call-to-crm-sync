# Work in progress: Sales call to CRM sync

Synthetic BuildZn portfolio project. Call transcripts become grounded candidate fields, conflict flags, a follow-up draft and an exact CRM diff. Applying the diff requires explicit operator approval of its hash and base CRM version. No external CRM or messages.

```mermaid
flowchart TD
  A[Synthetic multi-speaker call] --> B[Chunked extraction and quote validation]
  B --> C[Global conflict merge]
  C --> D[CRM before and after diff]
  D --> E[Exact diff and version approval]
  E --> F[Atomic CRM write and audit]
  C --> G[Follow-up draft and review flags]
```

## Run

Node 24 and Docker Compose:

```sh
git clone <repository-url>
cd sales-call-to-crm-sync
docker compose up -d db
npm ci
DATABASE_URL=postgres://portfolio:synthetic-local-only@localhost:55432/portfolio npm run demo
```

Or `docker compose up --build --abort-on-container-exit --exit-code-from app`. Public synthetic database password is local configuration. Tests truncate tables; use a disposable database. `docker compose down -v` resets local data.

```sh
npm run build
DATABASE_URL=postgres://portfolio:synthetic-local-only@localhost:55432/portfolio npm test
```

Supplemental cloud commands: `TEST_PGLITE=1 npm test` and `TEST_PGLITE=1 npm run demo`. These run embedded PostgreSQL, not Docker.

## Measured results

30 tests passed, zero failed or skipped. TypeScript check passed. A 4,000-line synthetic transcript was processed through its final chunk, with distant budget conflicts preserved. Long single-utterance overlap initially created a false conflict; merging fragments by their source statement location fixed it while retaining separate conflicting statements. Raw results and real demo output are in docs/test-output.txt and docs/demo-output.md. Native PostgreSQL CI and clean-clone Docker verification remain pending.

## Tradeoffs and limits

Evidence must occur verbatim in the source and pass field-specific lexical grounding. This limits hallucinated structured writes, but intentionally restricts supported language patterns. The deterministic provider is a transparent baseline, not a general speech-understanding system. Live Claude quality is unmeasured. Only USD budget, exact dates, a small English/Urdu phrase set and the documented next-week interpretation are supported. Unsupported currency and ambiguous values are withheld. Speaker labeling must already exist in the transcript; no diarization or audio transcription is included.

CRM is a PostgreSQL-backed mock. The trusted caller supplies the target deal and reviewer identity; a public auth or external CRM integration is not included. Approved diffs use canonical hashes, optimistic versions and transactionally recorded audit entries. Stale proposals are rejected and require operator investigation; this version does not include a proposal refresh CLI. Database administrators can bypass application controls. Contacts are additive; missing facts never clear existing fields. Empty diffs can still be explicitly approved and applied, incrementing the mock version; a production UI should hide that no-op operation.

No UI, screenshots, hosting or deployment. Demo approval is explicit in code by a named synthetic reviewer after printing the diff. A production reviewer interface is not included. See docs/PLAN.md, docs/ASSUMPTIONS.md and docs/BLOCKERS.md.
