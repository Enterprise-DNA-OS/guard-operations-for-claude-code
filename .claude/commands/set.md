---
description: "Change a house rule: max_shift_hours, min_rest_hours, max_week_hours, client_notify_hours, gst_nz_pct or gst_au_pct."
---

# set

Change a house rule: max_shift_hours, min_rest_hours, max_week_hours, client_notify_hours, gst_nz_pct or gst_au_pct.

Run `node scripts/guarding.mjs set <key> <value> --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the settings after the change.
