---
description: "Bring sites, employees (with licences) or scheduled shifts across from a TrackTik export (comma-separated). Dry run first. Import sites, then officers, then shifts."
---

# import

Bring sites, employees (with licences) or scheduled shifts across from a TrackTik export (comma-separated). Dry run first. Import sites, then officers, then shifts.

Run `node scripts/guarding.mjs import tracktik <file.csv> --kind=sites|officers|shifts [--client=<client>] [--region=<region>] [--map=<map.json>] --actor="<name>" --dry-run`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Follow docs/replace-tracktik.md. Run with --dry-run, show the counts, then again without it once the operator agrees. One bad row stops the whole file.
