export type Field = "budgetMinor" | "closeDate" | "nextStep" | "nextStepDate";
export interface Evidence {
  field: Field;
  value: string | number;
  speaker: string;
  quote: string;
}
export interface Extraction {
  candidates: Evidence[];
  contacts: string[];
  flags: string[];
}
export interface Context {
  occurredAt: string;
  timezone: string;
  company: string;
}
export interface Provider {
  extract(chunk: string, context: Context): Promise<unknown>;
  followup(fields: Record<string, unknown>, flags: string[]): Promise<string>;
}
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function nextMonday(c: Context) {
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: c.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(c.occurredAt));
  const d = new Date(local + "T00:00:00Z");
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + ((8 - day) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
export function chunks(text: string, max = 4000): string[] {
  const result: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (line.length > max) {
      if (current) {
        result.push(current);
        current = "";
      }
      const m = line.match(/^([^:]{1,150}:)\s*/);
      const prefix = m?.[0] ?? "",
        body = line.slice(prefix.length),
        step = max - prefix.length - 200;
      if (step < 1) throw new Error("Speaker prefix too long");
      for (let i = 0; i < body.length; i += step)
        result.push(prefix + body.slice(i, i + max - prefix.length));
    } else if (current.length + line.length + 1 > max) {
      result.push(current);
      current = line;
    } else current += (current ? "\n" : "") + line;
  }
  if (current) result.push(current);
  return result;
}
export function parseChunk(chunk: string, c: Context): Extraction {
  const out: Extraction = { candidates: [], contacts: [], flags: [] };
  for (const line of chunk.split("\n")) {
    const m = line.match(/^([^():]{1,80})\s*\(([^)]{1,80})\):\s*(.*)$/);
    const speaker = m?.[1]?.trim() ?? "Unknown",
      company = m?.[2]?.trim(),
      utterance = m?.[3] ?? line;
    if (company === c.company && speaker !== "Unknown")
      out.contacts.push(speaker);
    for (const body of utterance.split(/(?<=[.!?])\s+/)) {
      const add = (field: Field, value: string | number) =>
        out.candidates.push({ field, value, speaker, quote: body });
      const budget = body.match(
        /(?:budget|بجٹ)\s*(?:is|ہے|:)?\s*\$?([0-9][0-9,]*(?:\.[0-9]{1,2})?)(?![\w,]|\.\d)\s*(?:USD|dollars|ڈالر)?/i,
      );
      if (budget && /EUR|GBP|PKR|€|£/i.test(body)) {
        out.flags.push("unsupported-currency");
      } else if (budget) {
        const raw = budget[1]!;
        if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw))
          out.flags.push("transcript-number-error");
        else {
          const n = Math.round(Number(raw.replaceAll(",", "")) * 100);
          if (Number.isSafeInteger(n) && n > 0) add("budgetMinor", n);
          else out.flags.push("invalid-budget");
        }
      } else if (/budget|بجٹ/i.test(body)) out.flags.push("unparsed-budget");
      const close = body.match(/close date\s*:?\s*(\d{4}-\d{2}-\d{2})/i);
      if (close) {
        if (validDate(close[1]!)) add("closeDate", close[1]!);
        else out.flags.push("invalid-close-date");
      }
      const step = body
        .match(/(?:next step|اگلا قدم)\s*:\s*(.+?)(?:[.!?](?:\s|$)|$)/i)?.[1]
        ?.trim();
      if (step) {
        add("nextStep", step);
        const date = step.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        if (date && validDate(date)) add("nextStepDate", date);
        else if (/next week|اگلے ہفتے/i.test(step)) {
          const d = nextMonday(c);
          add("nextStepDate", d);
          out.flags.push("vague-next-week:" + d);
        } else out.flags.push("missing-next-step-date");
      }
    }
  }
  return out;
}
export class MockProvider implements Provider {
  async extract(chunk: string, c: Context) {
    return parseChunk(chunk, c);
  }
  async followup(fields: Record<string, unknown>, flags: string[]) {
    return `Synthetic follow-up draft. Proposed next step: ${fields.nextStep ?? "Please confirm the next step"}. Review flags: ${flags.join(", ") || "none"}.`;
  }
}
export function validateExtraction(
  raw: unknown,
  transcript: string,
  c: Context,
): Extraction {
  if (!raw || typeof raw !== "object") throw new Error("Malformed extraction");
  const r = raw as Partial<Extraction>;
  if (
    !Array.isArray(r.candidates) ||
    !Array.isArray(r.contacts) ||
    !Array.isArray(r.flags) ||
    r.candidates.length > 1000 ||
    r.contacts.length > 200 ||
    r.flags.length > 1000
  )
    throw new Error("Malformed extraction");
  for (const e of r.candidates) {
    if (
      !e ||
      !["budgetMinor", "closeDate", "nextStep", "nextStepDate"].includes(
        e.field,
      ) ||
      typeof e.speaker !== "string" ||
      typeof e.quote !== "string" ||
      !e.quote ||
      !transcript.includes(e.quote)
    )
      throw new Error("Ungrounded evidence");
    if (
      e.speaker !== "Unknown" &&
      !transcript
        .split("\n")
        .some((l) => l.startsWith(e.speaker + " (") && l.includes(e.quote))
    )
      throw new Error("Ungrounded speaker");
    const expected = parseChunk(`${e.speaker} (${c.company}): ${e.quote}`, c);
    if (
      !expected.candidates.some(
        (x) => x.field === e.field && x.value === e.value,
      )
    )
      throw new Error("Unsupported value in evidence");
  }
  for (const name of r.contacts)
    if (
      typeof name !== "string" ||
      !transcript
        .split("\n")
        .some((l) => l.startsWith(`${name} (${c.company}):`))
    )
      throw new Error("Ungrounded contact");
  if (r.flags.some((f) => typeof f !== "string" || f.length > 300))
    throw new Error("Malformed flags");
  return { candidates: r.candidates, contacts: r.contacts, flags: r.flags };
}
