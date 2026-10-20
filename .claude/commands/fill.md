---
description: "Put an officer on a shift. Refuses outright if the law would be broken (no current licence or certificate, NSW subcontracting without the client's written agreement or notice, NZ emergency cover past 2 weeks). A house rule (induction, rest, shift length, weekly hours) refuses unless --override names the reason, which is logged."
---

# fill

Put an officer on a shift. Refuses outright if the law would be broken (no current licence or certificate, NSW subcontracting without the client's written agreement or notice, NZ emergency cover past 2 weeks). A house rule (induction, rest, shift length, weekly hours) refuses unless --override names the reason, which is logged.

Run `node scripts/guarding.mjs fill <shift> <officer> --actor="<name>" [--emergency] [--override="<reason>"]`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If it refuses, run `/cover` and offer the best alternative. Use --emergency only for an NZ officer who has applied for a certificate, when illness or an emergency leaves you short (s 61). Never invent an override reason.
