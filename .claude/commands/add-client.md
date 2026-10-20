---
description: "Add a client. The currency follows the country (NZ is NZD, AU is AUD)."
---

# add-client

Add a client. The currency follows the country (NZ is NZD, AU is AUD).

Run `node scripts/guarding.mjs add-client --code=<CODE> --name="<name>" --country=NZ|AU [--contact=] [--email=] [--invoice-days=20] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
