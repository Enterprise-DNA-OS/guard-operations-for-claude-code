---
description: "Draft a reminder to an officer whose certificate or licence is running out, with the rule that applies. Written to drafts/, never sent."
---

# draft-licence-reminder

Draft a reminder to an officer whose certificate or licence is running out, with the rule that applies. Written to drafts/, never sent.

Run `node scripts/guarding.mjs draft-licence-reminder <officer>`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the draft. A person sends it.
