# Rules and sources

`/compliance` checks the records against these rules. Each row says where the rule comes from, what a breach looks like in the data, and where it is checked. Laws are checked as law; house rules are the business's own limits, changed with `set`, and are never reported as law.

Nothing here is legal advice. It records the rules the operator has asked the system to enforce. If a rule changes, update this page and the check together (`/customise`), then run `npm test`.

## Law

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| A person working as a property guard, crowd controller, personal guard or other responsible employee holds a certificate of approval | Private Security Personnel and Private Investigators Act 2010 (NZ) s 44 | A shift at an NZ site with no certificate or temporary certificate current from the shift's start date to its end date | `v_shift_problems` (no current licence); `fill`, `add-shift`, `sign-on` refuse |
| A certificate of approval expires 5 years from issue; lodging a renewal before expiry keeps it in force until decided | PSPPI Act 2010 s 56(1) and (3) | Expiry set past 5 years (refused by the database); expiry passed with shifts after it | `licences` check constraint; `add-licence` default; `v_licences` |
| A temporary certificate of approval is in force for 3 months, or until the full certificate is issued | PSPPI Act 2010 s 60(5) | A temporary certificate longer than 3 months (refused); one expired with no full certificate | `licences` check constraint; `/compliance`; `/attention` warns 21 days out when no training is recorded |
| An emergency appointment (certificate applied for, short of staff through illness or emergency) lasts no more than 2 continuous weeks | PSPPI Act 2010 s 61 | An emergency-cover shift starting 14 days or more after that officer's first emergency shift | `v_shift_problems` (emergency cover past 2 weeks). The 14 days run from the first emergency shift, a stricter reading than continuous employment |
| A licensee or certificate holder wears the identification badge while working | PSPPI Act 2010 s 67 | Not in the data. It is printed on the site instructions as a reminder | `npm run docs -- site-instructions` |
| A security officer in Australia holds the licence for the state they work in | Security Industry Act 1997 (NSW); Private Security Act 2004 (VIC); Security Providers Act 1993 (QLD); and each state's equivalent | A shift at an Australian site with no security licence for that state current for the whole shift | `v_shift_problems` (no current licence) |
| A NSW master licensee does not subcontract security work to another master licensee unless the client has expressly agreed in writing | Security Industry Act 1997 (NSW) s 38A(1)(a) | A subcontracted officer on a NSW site with no client agreement date, or one later than the shift | `v_shift_problems`; `client-agreement` records it |
| and gives written notice of the subcontractor's name and master licence number | Security Industry Act 1997 (NSW) s 38A(1)(b) and the definition of requisite subcontracting particulars | A subcontracted officer on a NSW site with no notice date, or one later than the shift | `v_shift_problems`; `notice` records it; `add-subcontractor` requires the master licence for NSW |
| A notifiable event (a death, a notifiable injury or illness, or a notifiable incident) is reported to the regulator as soon as possible | Health and Safety at Work Act 2015 (NZ) s 56; Work Health and Safety Act 2011 (AU model law, as enacted in each state) s 38 | An incident marked notifiable with no regulator notification recorded | `v_incidents` (regulator not notified); `/attention`; `close-incident` refuses |

Sources, checked 20 October 2026:

- PSPPI Act 2010: https://www.legislation.govt.nz/act/public/2010/0115/latest/ (ss 36, 44, 56, 60, 61, 67)
- Security Industry Act 1997 (NSW) s 38A, as amended by the Security Industry Amendment Act 2022: https://legislation.nsw.gov.au/view/html/inforce/current/act-1997-157
- NSW Police, master licence and subcontracting guidance: https://www.police.nsw.gov.au/online_services/security_licensing_and_enforcement_directorate/security_licences/frequently_asked_questions/master_licence_faqs_contents/q._do_i_need_a_master_licence_if_i_am_subcontracting
- PSPLA training and temporary certificates: https://www.justice.govt.nz/tribunals/licences-certificates/pspla/training-and-skills/
- HSWA 2015 s 56: https://www.legislation.govt.nz/act/public/2015/0070/latest/
- Model WHS Act s 38: https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws

## House rules (change them with `set`)

| Setting | Default | What it checks | Why |
|---|---|---|---|
| induction | per site (`induction_required`) | An officer works a site only after an induction there | The duty to give workers the information and instruction they need: HSWA 2015 s 36 (NZ), WHS Act 2011 s 19 (AU). The rule itself is the business's |
| `min_rest_hours` | 10 | Hours between the end of one shift and the start of the next | Fatigue. No statute sets a number for guards; set your own and your award's |
| `max_shift_hours` | 12 | Longest single shift | Fatigue and most guarding contracts |
| `max_week_hours` | 60 | Hours rostered in one week (Monday to Sunday) | Fatigue and overtime cost |
| `client_notify_hours` | 24 | Hours before an incident must have been reported to the client | Most guarding contracts set a reporting window; put yours here |
| `gst_nz_pct`, `gst_au_pct` | 15, 10 | GST on invoices | GST rates |

A house rule can be overridden on a shift with `--override="<reason>"`. The reason is stored on the shift and in the activity log. The law cannot be overridden.
