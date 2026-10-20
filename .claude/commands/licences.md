---
description: "Every active officer's certificate or licence, soonest to expire first, with the next rostered shift. --days=N shows only those expiring within N days."
---

# licences

Every active officer's certificate or licence, soonest to expire first, with the next rostered shift. --days=N shows only those expiring within N days.

Run `node scripts/guarding.mjs licences [--days=60]`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Flag anyone whose licence runs out before a rostered shift. Offer `/draft-licence-reminder`.
