---
description: "Record that the client was told about an incident (now, or --at)."
---

# notify-client

Record that the client was told about an incident (now, or --at).

Run `node scripts/guarding.mjs notify-client <ref> [--at="YYYY-MM-DD HH:MM"] [--note=] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
