import { createHash } from "node:crypto";
import type { Database } from "./db.js";
import {
  chunks,
  validateExtraction,
  parseChunk,
  type Provider,
  type Context,
  type Extraction,
} from "./extraction.js";
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, canonical(x)]),
    );
  return v;
}
const hash = (v: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(v)))
    .digest("hex");
export interface Call {
  id: string;
  deal: string;
  transcript: string;
  occurredAt: string;
  timezone: string;
}
export type Diff = Record<string, { before: unknown; after: unknown }>;
export class CRMCallAgent {
  constructor(
    private db: Database,
    private provider: Provider,
  ) {}
  async ingest(call: Call) {
    if (
      !call.id ||
      !call.deal ||
      !call.transcript.trim() ||
      call.transcript.length > 1000000 ||
      !Number.isFinite(Date.parse(call.occurredAt))
    )
      throw new Error("Invalid call");
    new Intl.DateTimeFormat("en", { timeZone: call.timezone }).format(
      new Date(call.occurredAt),
    );
    const normalized = call.transcript.replace(/\r\n/g, "\n").trim();
    const fingerprint = hash([
      call.deal,
      normalized,
      new Date(call.occurredAt).toISOString(),
      call.timezone,
    ]);
    await this.db.tx(async (q) => {
      await q.query(
        "INSERT INTO calls VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
        [
          call.id,
          fingerprint,
          call.deal,
          normalized,
          call.occurredAt,
          call.timezone,
        ],
      );
      const [sameId] = await q.query("SELECT * FROM calls WHERE id=$1", [
        call.id,
      ]);
      if (sameId && sameId.fingerprint !== fingerprint)
        throw new Error("Conflicting call ID");
    });
    const [stored] = await this.db.query(
      "SELECT * FROM calls WHERE fingerprint=$1",
      [fingerprint],
    );
    if (!stored) throw new Error("Missing call checkpoint");
    return stored.id as string;
  }
  async propose(callId: string) {
    const [call] = await this.db.query("SELECT * FROM calls WHERE id=$1", [
      callId,
    ]);
    if (!call) throw new Error("Unknown call");
    const [deal] = await this.db.query("SELECT * FROM deals WHERE id=$1", [
      call.deal,
    ]);
    if (!deal) throw new Error("Unknown deal");
    const prior = await this.db.query("SELECT * FROM proposals WHERE id=$1", [
      callId,
    ]);
    if (prior.length) return prior[0]!;
    const context: Context = {
      occurredAt: new Date(call.occurred_at).toISOString(),
      timezone: call.timezone,
      company: deal.company,
    };
    const extraction: Extraction = { candidates: [], contacts: [], flags: [] };
    for (const chunk of chunks(call.transcript)) {
      const part = validateExtraction(
        await this.provider.extract(chunk, context),
        call.transcript,
        context,
      );
      // Preserve detectable source conflicts even if a model omits a candidate.
      extraction.candidates.push(
        ...part.candidates,
        ...parseChunk(chunk, context).candidates,
      );
      extraction.contacts.push(...part.contacts);
      extraction.flags.push(...part.flags);
    }
    // Overlap fragments referring to the same source marker are one statement.
    const byOccurrence = new Map<
      string,
      (typeof extraction.candidates)[number]
    >();
    for (const e of extraction.candidates) {
      const marker =
        e.field === "budgetMinor"
          ? /(?:budget|بجٹ)/i
          : e.field === "closeDate"
            ? /close date/i
            : /(?:next step|اگلا قدم)/i;
      const pos = e.quote.search(marker);
      const start = call.transcript.indexOf(e.quote);
      const key = [e.field, e.speaker, start + pos].join(":");
      const prior = byOccurrence.get(key);
      if (
        !prior ||
        e.quote.length - pos > prior.quote.length - prior.quote.search(marker)
      )
        byOccurrence.set(key, e);
    }
    extraction.candidates = [...byOccurrence.values()];
    extraction.contacts = [...new Set(extraction.contacts)].sort();
    const fields: Record<string, unknown> = {};
    for (const field of [
      "budgetMinor",
      "closeDate",
      "nextStep",
      "nextStepDate",
    ] as const) {
      const candidates = extraction.candidates.filter((e) => e.field === field);
      const values = [...new Set(candidates.map((e) => e.value))];
      if (values.length === 1) fields[field] = values[0];
      else if (values.length > 1) extraction.flags.push("conflict:" + field);
    }
    if (!fields.nextStep) {
      delete fields.nextStepDate;
      extraction.flags.push("no-next-step");
    }
    if (extraction.contacts.length)
      fields.contacts = [
        ...new Set([
          ...(Array.isArray(deal.fields.contacts) ? deal.fields.contacts : []),
          ...extraction.contacts,
        ]),
      ].sort();
    const diff: Diff = {};
    for (const [field, value] of Object.entries(fields)) {
      const before = deal.fields[field] ?? null;
      if (JSON.stringify(before) !== JSON.stringify(value)) {
        diff[field] = { before, after: value };
        if (before !== null && field !== "contacts")
          extraction.flags.push("crm-contradiction:" + field);
      }
    }
    extraction.flags = [...new Set(extraction.flags)].sort();
    const followup = await this.provider.followup(fields, extraction.flags);
    if (!followup.trim() || followup.length > 15000)
      throw new Error("Invalid followup draft");
    const diffHash = hash([callId, deal.version, diff]);
    await this.db.query(
      "INSERT INTO proposals(id,extraction,diff,base_version,diff_hash,followup) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
      [
        callId,
        JSON.stringify(extraction),
        JSON.stringify(diff),
        deal.version,
        diffHash,
        followup,
      ],
    );
    return (
      await this.db.query("SELECT * FROM proposals WHERE id=$1", [callId])
    )[0]!;
  }
  async approve(id: string, actor: string, seenHash: string) {
    if (!actor.trim()) throw new Error("Operator required");
    return this.db.tx(async (q) => {
      const [p] = await q.query(
        "SELECT * FROM proposals WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!p || p.diff_hash !== seenHash || p.applied)
        throw new Error("Exact displayed diff required");
      const [d] = await q.query(
        "SELECT d.* FROM deals d JOIN calls c ON c.deal=d.id WHERE c.id=$1 FOR UPDATE OF d",
        [id],
      );
      if (d!.version !== p.base_version) throw new Error("Stale CRM version");
      await q.query(
        "UPDATE proposals SET approved_by=$2,approved_hash=$3 WHERE id=$1",
        [id, actor, seenHash],
      );
    });
  }
  async apply(id: string, dryRun = true, failBeforeCommit = false) {
    return this.db.tx(async (q) => {
      const [p] = await q.query(
        "SELECT * FROM proposals WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (
        !p ||
        !p.approved_by ||
        p.approved_hash !== p.diff_hash ||
        p.diff_hash !== hash([id, p.base_version, p.diff])
      )
        throw new Error("Exact diff approval required");
      if (p.applied) return "already-applied";
      const [d] = await q.query(
        "SELECT d.* FROM deals d JOIN calls c ON c.deal=d.id WHERE c.id=$1 FOR UPDATE OF d",
        [id],
      );
      if (d!.version !== p.base_version) throw new Error("Stale CRM version");
      const fields = { ...d!.fields };
      for (const [key, change] of Object.entries(p.diff as Diff)) {
        if (
          ![
            "budgetMinor",
            "closeDate",
            "nextStep",
            "nextStepDate",
            "contacts",
          ].includes(key)
        )
          throw new Error("Unsupported CRM field");
        if (
          JSON.stringify(fields[key] ?? null) !== JSON.stringify(change.before)
        )
          throw new Error("Before value changed");
        fields[key] = change.after;
      }
      if (dryRun) return "dry-run";
      await q.query(
        "UPDATE deals SET fields=$2,version=version+1 WHERE id=$1",
        [d!.id, JSON.stringify(fields)],
      );
      await q.query("INSERT INTO audit(proposal,actor,diff) VALUES($1,$2,$3)", [
        id,
        p.approved_by,
        JSON.stringify(p.diff),
      ]);
      if (failBeforeCommit) throw new Error("Simulated CRM failure");
      await q.query("UPDATE proposals SET applied=true WHERE id=$1", [id]);
      return "applied";
    });
  }
}
