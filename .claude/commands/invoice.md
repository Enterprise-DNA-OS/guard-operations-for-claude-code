---
description: "Raise an invoice for a client from every worked, uninvoiced shift in the period, at the site's bill rate, with GST (15% NZ, 10% AU). A shift is never invoiced twice."
---

# invoice

Raise an invoice for a client from every worked, uninvoiced shift in the period, at the site's bill rate, with GST (15% NZ, 10% AU). A shift is never invoiced twice.

Run `node scripts/guarding.mjs invoice <client> --from=YYYY-MM-DD --to=YYYY-MM-DD --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the total. It is a record and a document (`npm run docs -- invoice`); send it from your accounts system.
