# Progress

Done: plan, grounded extraction, speaker/contact preservation, chunking/global conflict handling, timezone-anchored dates, mock/Claude provider interface, persistent call deduplication, exact diff hashes, approvals, optimistic CRM version checks, transactional writes/audit, 30 passing tests and real embedded PostgreSQL demo.

Results: TypeScript passed; 30 tests passed, 0 failed/skipped. Fixed long-utterance overlap without weakening conflict tests. No real customer data or live Claude calls.

Running: none at checkpoint.

Next: publish new repo and run native PostgreSQL Actions plus clean-clone Docker demo. Repository creation/auth and Docker remain blocked. See docs/BLOCKERS.md. No deployment. Portfolio site edits and PR must wait for the project gates; no existing repository changed.

Fresh local git clone verified: npm ci, formatting, TypeScript, embedded PostgreSQL tests and demo passed. Working tree remained clean. Evidence: docs/clean-clone-output.txt. Native Docker and GitHub Actions gates remain unverified.

Final conflict review preserves detectable source candidates even if a model omits them. Test count is 30.
