---
description: "Show what needs a person today: open shifts, shifts rostered against the law, house rules broken, expired and expiring licences, temporary certificates ending without training, no sign-on, not signed off, missed patrols, incidents the regulator or client has not heard about, sites under contract hours, overdue invoices and old unbilled work."
---

# attention

Show what needs a person today: open shifts, shifts rostered against the law, house rules broken, expired and expiring licences, temporary certificates ending without training, no sign-on, not signed off, missed patrols, incidents the regulator or client has not heard about, sites under contract hours, overdue invoices and old unbilled work.

Run `node scripts/guarding.mjs attention`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with anything that breaks the law and anything happening in the next 12 hours. Suggest the one next step for each line (usually `/cover`, `/draft-licence-reminder` or `/notify-client`).
