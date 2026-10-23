import type { Query } from "./db.js";
export async function migrate(q: Query) {
  for (const s of [
    `CREATE TABLE IF NOT EXISTS deals(id text PRIMARY KEY, company text NOT NULL, fields jsonb NOT NULL, version integer NOT NULL DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS calls(id text PRIMARY KEY, fingerprint text UNIQUE NOT NULL, deal text NOT NULL REFERENCES deals(id), transcript text NOT NULL, occurred_at timestamptz NOT NULL, timezone text NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS proposals(id text PRIMARY KEY REFERENCES calls(id), extraction jsonb NOT NULL, diff jsonb NOT NULL, base_version integer NOT NULL, diff_hash text NOT NULL, followup text NOT NULL, approved_by text, approved_hash text, applied boolean NOT NULL DEFAULT false)`,
    `CREATE TABLE IF NOT EXISTS audit(proposal text PRIMARY KEY REFERENCES proposals(id), actor text NOT NULL, diff jsonb NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`,
  ])
    await q.query(s);
}
