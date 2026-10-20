---
description: "Add a patrol checkpoint to a site and how often it must be scanned."
---

# add-checkpoint

Add a patrol checkpoint to a site and how often it must be scanned.

Run `node scripts/guarding.mjs add-checkpoint <site> --name="<checkpoint>" --every=<minutes> --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
