# Assumptions

All transcripts, identities, companies and CRM records are synthetic. CLI only, trusted caller maps a call to a deal and supplies the operator approval identity. No real CRM HTTP service or public authentication. No follow-up messages are sent. Every write is a diff with explicit approval, including contacts.

Supported fields: budget in integer USD minor units, close date, next-step text/date, customer contact display names. Missing fields do not clear existing values. Conflicting candidate values are withheld and flagged. Existing-value contradictions require approval of the displayed diff. Unknown or unsupported currency/relative dates stay unmodified and flagged.

Next week means Monday of the next calendar week in the call's IANA timezone, flagged as an interpretation requiring review. No holiday calendar. Exact dates use YYYY-MM-DD. A known list of English/Urdu phrases forms the deterministic extraction baseline; live Claude performance is unmeasured. Candidate evidence must occur verbatim in the transcript and satisfy field-specific grounding checks.

Transcript limit is one million UTF-16 code units. Chunking uses 4000-character fragments with overlap for unusually long utterances, keeps speaker labels, and merges all candidates globally. Quotes and flags are retained for review. Natural-language understanding remains limited and conservative. No paid calls.

Remote creation/auth, native PostgreSQL and Docker checks remain blocked. Owner/site verified as umair24171 and umair24171/dev_umair. No deployment.

Source code is provided under the MIT license. Public repository names and topics are proposed until GitHub creation succeeds.
