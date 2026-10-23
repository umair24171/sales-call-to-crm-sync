# Recorded native and Docker demo output

All data synthetic. [Verified Actions run](https://github.com/umair24171/sales-call-to-crm-sync/actions/runs/40031451224). No hosting deployment.

## Native PostgreSQL demo

```text
##[group]Run npm run demo
npm run demo
shell: /usr/bin/bash -e {0}
env:
  DATABASE_URL: ***localhost:5432/portfolio
##[endgroup]

> buildzn-sales-call-to-crm-sync@0.1.0 demo
> node --import tsx src/demo.ts

All data synthetic. No external CRM writes or messages.
Review diff: {
  "contacts": {
    "after": [
      "Amina",
      "Bilal"
    ],
    "before": []
  },
  "nextStep": {
    "after": "send proposal next week",
    "before": null
  },
  "budgetMinor": {
    "after": 1000000,
    "before": 500000
  },
  "nextStepDate": {
    "after": "2026-01-26",
    "before": null
  }
}
Flags: [ 'crm-contradiction:budgetMinor', 'vague-next-week:2026-01-26' ]
Follow-up draft: Synthetic follow-up draft. Proposed next step: send proposal next week. Review flags: crm-contradiction:budgetMinor, vague-next-week:2026-01-26.
Before approval CRM version: 1
Dry run: dry-run
Explicitly approved apply: applied
Retry: already-applied
Audit records: 1
```

## Docker Compose demo

```text
app-1  |
app-1  | > buildzn-sales-call-to-crm-sync@0.1.0 demo
app-1  | > node --import tsx src/demo.ts
app-1  |
app-1  | All data synthetic. No external CRM writes or messages.
app-1  | Review diff: {
app-1  |   "contacts": {
app-1  |     "after": [
app-1  |       "Amina",
app-1  |       "Bilal"
app-1  |     ],
app-1  |     "before": []
app-1  |   },
app-1  |   "nextStep": {
app-1  |     "after": "send proposal next week",
app-1  |     "before": null
app-1  |   },
app-1  |   "budgetMinor": {
app-1  |     "after": 1000000,
app-1  |     "before": 500000
app-1  |   },
app-1  |   "nextStepDate": {
app-1  |     "after": "2026-01-26",
app-1  |     "before": null
app-1  |   }
app-1  | }
app-1  | Flags: [ 'crm-contradiction:budgetMinor', 'vague-next-week:2026-01-26' ]
app-1  | Follow-up draft: Synthetic follow-up draft. Proposed next step: send proposal next week. Review flags: crm-contradiction:budgetMinor, vague-next-week:2026-01-26.
app-1  | Before approval CRM version: 1
app-1  | Dry run: dry-run
app-1  | Explicitly approved apply: applied
app-1  | Retry: already-applied
app-1  | Audit records: 1
```
