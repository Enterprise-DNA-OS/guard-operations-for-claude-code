---
description: "Checkpoint scans due against scans done, by site and checkpoint, over the last 7 days (or --days=N), with who missed them."
---

# patrols

Checkpoint scans due against scans done, by site and checkpoint, over the last 7 days (or --days=N), with who missed them.

Run `node scripts/guarding.mjs patrols [--days=7]`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with the lowest completion. Name the officer and the nights.
