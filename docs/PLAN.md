# Sales call to CRM sync plan

## Scope
Parse synthetic multi-speaker transcripts into grounded candidate CRM fields, surface conflicts and missing next steps, generate a follow-up draft, show every proposed write as a before/after diff, and require approval bound to the exact diff and CRM version before atomic application. No external CRM or messaging.

## Data model
CRM deals with JSON fields and optimistic version. Immutable calls with normalized transcript fingerprint and trusted deal mapping. Proposals with extraction evidence, flags, before/after diff, base version, diff hash and approval state. Applied-write audit keyed by proposal; duplicate ingestion reuses call/proposal.

## Tools
TypeScript CLI, PostgreSQL, Claude extraction provider and deterministic mock, chunked transcript processing with bounded overlap, date anchoring in call timezone, Node unit/integration/adversarial tests, Docker Compose and GitHub Actions PostgreSQL.

## Edge cases mapped to named tests
1. Several speakers keep quote provenance; two customer contacts from the same company are retained.
2. Conflicting budget or dates are flagged and not silently selected.
3. Missing fields preserve existing CRM values; absent next step is flagged.
4. Vague next week resolves to the next Monday in call timezone with an ambiguity flag.
5. Transcript number errors or unsupported claims do not create invented values.
6. Mixed Urdu/English next-step and budget text is handled conservatively.
7. Same call ID/content and same content under another ID deduplicate; conflicting reused ID rejected.
8. Existing CRM contradiction appears in exact before/after diff and flag.
9. Very long transcripts process every chunk; conflicts across distant chunks detected.
10. No write without exact diff approval; stale CRM version, changed diff or forged hash rejected.
11. Idempotent apply under retries/concurrency; precommit failure rolls back audit and write.
12. Model output cannot inject arbitrary CRM fields, fake evidence, authorizations or target deal IDs.
13. Provider failures create no writable proposal; invalid dates/timezones and empty/oversized input fail closed.
