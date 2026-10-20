---
description: "Record an officer starting a shift (now, or --at in site time). Refuses a shift that breaks the law: an officer without a current licence does not start."
---

# sign-on

Record an officer starting a shift (now, or --at in site time). Refuses a shift that breaks the law: an officer without a current licence does not start.

Run `node scripts/guarding.mjs sign-on <shift> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If it refuses, say why and run `/cover`.
