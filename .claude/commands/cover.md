---
description: "Who can take a shift: every active officer checked against the licence, induction, subcontracting, rest, shift-length and weekly-hours rules, those who can cover first, fewest hours that week first. Changes nothing."
---

# cover

Who can take a shift: every active officer checked against the licence, induction, subcontracting, rest, shift-length and weekly-hours rules, those who can cover first, fewest hours that week first. Changes nothing.

Run `node scripts/guarding.mjs cover <shift>`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Name the best one or two who can cover and why. Never suggest anyone marked cannot.
