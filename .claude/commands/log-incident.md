---
description: "Log an incident at a site: when (site time), type, severity, what happened, police event number, injury, and whether it is a notifiable event. The officer on shift is attached."
---

# log-incident

Log an incident at a site: when (site time), type, severity, what happened, police event number, injury, and whether it is a notifiable event. The officer on shift is attached.

Run `node scripts/guarding.mjs log-incident --site=<site> --at="YYYY-MM-DD HH:MM" --kind=<trespass|theft|damage|alarm|medical|fire|assault|suspicious|hazard|other> --summary="<one line>" [--severity=low|medium|high|critical] [--detail=] [--police=<event no>] [--injury] [--notifiable] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, officer, shift or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say the next step it prints. A notifiable event goes to WorkSafe (NZ) or the state regulator (AU) as soon as possible; the site is preserved.
