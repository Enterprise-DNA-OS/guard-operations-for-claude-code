---
description: "Add a shift at a site (site time), optionally repeated daily (--repeat=N) and optionally with an officer, who goes through the same checks as fill. A refused officer leaves no shifts behind."
---

# add-shift

Add a shift at a site (site time), optionally repeated daily (--repeat=N) and optionally with an officer, who goes through the same checks as fill. A refused officer leaves no shifts behind.

Run `node scripts/guarding.mjs add-shift --site=<site> --start="YYYY-MM-DD HH:MM" --hours=<n> [--repeat=N] [--officer=<officer>] [--role=<role>] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the shifts made.
