---
description: "Draft a client's service report for a period (default the last 30 days): hours delivered by site, patrol completion, incidents and shifts not covered. Written to drafts/, never sent."
---

# draft-client-report

Draft a client's service report for a period (default the last 30 days): hours delivered by site, patrol completion, incidents and shifts not covered. Written to drafts/, never sent.

Run `node scripts/guarding.mjs draft-client-report <client> [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Fill the bracketed lines with the operator.
