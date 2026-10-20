---
description: "Record a certificate of approval (NZ) or a state security licence (AU). In NZ the expiry defaults from the Act (5 years for a certificate, 3 months for a temporary one); in Australia copy it from the card."
---

# add-licence

Record a certificate of approval (NZ) or a state security licence (AU). In NZ the expiry defaults from the Act (5 years for a certificate, 3 months for a temporary one); in Australia copy it from the card.

Run `node scripts/guarding.mjs add-licence <officer> --region=<NZ|NSW|VIC|QLD|...> --number=<number> --issued=YYYY-MM-DD [--expires=YYYY-MM-DD] [--kind=coa|temporary-coa] [--classes="<classes>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Read the details back. Never guess a number or a date.
