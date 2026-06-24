---
author: claude
created: 2026-06-23
updated: 2026-06-23
tags: [project, business-logic, stage-1]
status: draft – awaiting Q&A review
---

## Open questions for Q&A

These questions are targeted gaps identified during extraction. Answers needed before the spec can be written.

| ID | Question | Why it matters |
|---|---|---|
| Q-1 | Is there any plan for a donor-facing interface (receipts, giving history, self-serve updates)? | Affects auth model and data exposure rules |
| Q-2 | What is the intended workflow after an admin reviews a Pending Review donation? What actions can they take? | Affects the admin UI spec for TICKET-115/116 |
| Q-3 | When a sponsorship is ended, what happens to future Stripe payments that arrive for that subscription? Are they still imported? | Affects import logic and status handling |
| Q-4 | Is the 24-hour donation deletion window a hard business rule or a soft policy? Is admin override (TICKET-106) the right solution, or should the window be configurable? | Shapes the deletion policy spec |
| Q-5 | Who receives the donation reports (monthly, quarterly, annual)? Are they exported to CSV, emailed, or viewed in-app? | Shapes TICKET-103/104/105 spec |
| Q-6 | Should individual donor giving statements (TICKET-133) be PDF, CSV, or printable HTML? How are they distributed? | Shapes the report format and delivery spec |
| Q-7 | Is the Stripe webhook integration (TICKET-026) still the intended path for ongoing real-time sync, or has CSV-based import become the permanent approach? | Affects the Stripe epic scope and sequencing |
| Q-8 | Are there any data retention requirements or legal obligations for how long donation or donor records must be kept? | Affects soft delete and purge policy |
| Q-9 | Can a child have more than one active sponsorship from different donors at the same time? The data model allows it but it is not clear if this is intentional or an oversight. | Clarifies the sponsorship uniqueness rule (BL-22 only prevents same donor+child+amount) |
| Q-10 | Are there any planned multi-admin features such as audit logs by user, per-user notifications, or user management? | Affects auth and user model scope |

Q1. No current plans for donnor-facing interface.
Q2. I'm not sure. What recomendations do you have?
Q3. As long as donations are coming in for that child / donor combo, the subscrption is said to still be open. If it is closed and something comes in, re-open it.
Q4. 24-hour donatoin deletion window is a policy for accidently incorect input. 24 hours is plenty of time to correct a mistake.
Q5. donations report should be viewable in app, and exported as a csv and pdf
Q6. PDF
Q7. strip webhhook integration is the prefered path forwards
Q8. as long as possible.
Q9. yes. it is a many to many relationship between children and sponsors.
Q10. not yet

---

## Round 2 – Follow-up questions

| ID | Question | Why it matters |
|---|---|---|
| FQ-1 | Q2 recommendation for confirmation: Pending Review actions would be (a) edit the donation status to any value, (b) edit the needs_attention_reason text field, (c) archive/soft-delete the donation if it is invalid garbage data, and (d) no forced resolution flow – items stay in the queue until admin acts. Does this match your expectation? | Needed to spec TICKET-115 and TICKET-116 |
| FQ-2 | Q3 follow-up: when a new payment re-opens an ended sponsorship, should the system REACTIVATE the existing record (clear end_date) or CREATE a new sponsorship record? Reactivating preserves original start_date as one continuous record. Creating new is cleaner history. | Affects import service and sponsorship model logic |
| FQ-3 | If a donor wants to increase or decrease their monthly amount for a child they already sponsor, what is the correct workflow? Option A: end the current sponsorship and create a new one at the new amount. Option B: edit the existing sponsorship's monthly_amount directly. | Affects TICKET-055 edit action spec and BL-22 |
| FQ-4 | For reports, which donations are included? Only succeeded status, or all statuses including failed, refunded, and canceled? For tax documents, typically only succeeded (completed payments) would be included. | Shapes report query scope for TICKET-103/104/105 |
| FQ-5 | For giving statements (TICKET-133), are they generated for a specific date range (e.g., "2025 annual statement"), downloaded per-donor from the donor detail page, or both? And are they for succeeded donations only? | Shapes the giving statement UI and generation scope |
| FQ-6 | Does the system need to track Stripe processing fees separately from donation amounts? Some charities report gross (what the donor paid) vs net (what the charity received after Stripe fees). Currently only the total amount is stored. | Affects whether Stripe fee fields need to be added to the data model |

FQ-1. Yes
FQ-2. I think it should start a new record. I'm trying to figure out the side-effects though. The history you siad is cleaner. I have a couple donors that are sponsoring the same child for the same amount multiple times. how would the system know which donation is which subscirption? is there a way to tell? how does stripe organize it as this is how we are getting data in the first place?
FQ-3. There is no way for them to easily increase or decrease their sponsorship. 1. We can send them a new link with the difference if greater. 2.Cancel the old one and send them a new link if greater or less. 3. They can cancel all together
FQ-4. Only successful donations are included in reports
FQ-5. A date range can be chosen. It can be all in agrigate (for audit and accounting). it can be per donor (for giving to donors for their records). They are succeeded donations only
FQ-6. We do want to track stripe fees. if report is for donor, it should be what they gave. the whole amount including fee. if the report is for us, we should be able to toggle on and off or have a seperate column for gross and net amount.

---

## Round 3 – Follow-up questions

| ID | Question | Why it matters |
|---|---|---|
| FQ-7 | See explanation below. | Critical for sponsorship data model |
| FQ-8 | In TICKET-055, what fields does the "edit sponsorship" action actually allow the admin to change, given that amount changes go through Stripe? Is the edit for correcting start_date, linking to a different child, or something else? | Scopes the TICKET-055 edit action |
| FQ-9 | See explanation below. | Critical for fee tracking data model |

**FQ-7 context – Stripe subscription_id and the "two subscriptions for same child" problem:**

Each Stripe subscription has a unique subscription_id (the "Cust Subscription Data ID" column in the CSV export). The system already stores this on each Donation record. So when the same donor has two separate active subscriptions for the same child at the same amount, the two streams of monthly payments can be told apart by their subscription_ids.

However, the current Sponsorship model does not store a subscription_id. When two subscriptions from the same donor for the same child at the same amount are imported, both get linked to the SAME Sponsorship record (because the system does find-or-create by donor + child + amount). The donations are separate records with different subscription_ids, but the sponsorships are collapsed.

This matters for FQ-2 (create new record on reactivation). If sponsorships do not store subscription_id, the system cannot tell which ended sponsorship to match when a new payment arrives. It would always create a new Sponsorship, which is fine but means you could accumulate many sponsorship records over time for the same donor-child pair as subscriptions are cancelled and restarted.

**Question for FQ-7:** Should the Sponsorship model store a stripe_subscription_id so that each Stripe subscription maps to exactly one Sponsorship record? This would: (a) correctly separate the two active subscriptions from the same donor for the same child into two distinct Sponsorship records, and (b) allow accurate reactivation (clear end_date on the matching subscription's sponsorship when a new payment arrives). The trade-off is added complexity in the import logic.

**FQ-9 context – where to store Stripe fees:**

The Stripe CSV provides three amount columns: Amount (what the donor paid), Fee (the Stripe processing cut), and Net (what the charity received). Currently only Amount is imported. Fee needs to be added to the data model.

Two options: (a) add a stripe_fee_cents field to the Donation record, which is clean and per-transaction but only relevant for Stripe payments; (b) add it to the StripeInvoice record, which keeps all Stripe-specific data together but requires a join for reporting.

Non-Stripe donations (cash, check, bank_transfer) have no Stripe fee, so their fee field would be null or zero.

**Question for FQ-9:** Should the stripe_fee_cents field live on the Donation record (simpler for reporting across all payment methods in one query) or on the StripeInvoice record (keeps Stripe-specific data together)? Either works technically.

FQ-7. For my purpose i don't think it matters. i don't need a clean history of a sponsorship. i just need to see what months they donated and what months they didn't.

FQ-8. Edit sponsorship is for manually entered values. Once the import is automated this becomes less needed. so right now i need to be able to edit all the same feilds as when i manually add. once import is live, then if a item is marked as stripe it should not be editable, but if it marked anything else, it should be editable.

FQ-9. If either works, either. For my use case what makes the most sense and requires the least amount of DB calls / queries?

---

## Round 4 – Follow-up questions

| ID | Question | Why it matters |
|---|---|---|
| FQ-10 | The monthly donation view (which months paid, which missed) – should this be surfaced per sponsorship (this donor for this child), per child (all donors for one child across months), per donor (all children this donor sponsors across months), or all three? | Shapes the UI surface and query design |
| FQ-11 | For "Stripe-sourced = read-only" on sponsorships: the Sponsorship record itself has no payment_method or source field. Should the system determine this by checking if any linked donation has payment_method stripe, or should a source field (stripe vs manual) be added to the Sponsorship model? | Needs to be decided before TICKET-055 edit spec is written |
| FQ-12 | Check donations (payment_method: check) – does the system need to track check numbers, deposit dates, or bank reference numbers for reconciliation? Or is the date and amount sufficient? | May require additional fields on the Donation model |

FQ-10. all three
FQ-11. stripe will hit a webhook in our app that says a new payment has occured. this will then enter the data. if the webhook is used to add data then it is a stripe donation and should have stripe srouce automatically added.
FQ-12. Right now date is sufficient.

---

## Round 5 – Follow-up questions

| ID | Question | Why it matters |
|---|---|---|
| FQ-13 | The webhook answer tags webhook-created donations as stripe_webhook source, making their sponsorships read-only. What about donations already imported from Stripe CSV (tagged stripe_csv)? Should those also trigger the read-only lock on their sponsorships, or is the lock only for webhook-sourced donations going forward? | All current production data came from CSV import. If stripe_csv also locks, all existing sponsorships are immediately read-only. If only stripe_webhook locks, existing sponsorships stay editable until the webhook fires. |
| FQ-14 | Is there a home or dashboard screen with summary stats (active sponsorships, total donated this month, etc.), or does the app open directly to the Donations list? | Shapes the landing page and any aggregate query needs |

fq-13. fq-13 csv import was for mass input and as a recovery solution. the reason for this is that data has changed posted entering. for example if a donor email or name changed, it is stored in our system but not reflected on the sheet. the sheet shows the original value not the new one. i don't plan to keep using the csv unless something catestrophic happens to the db. which also means i need a db backup solution.
fq-14. i don't think i have a home dashboard, but that sounds very useful to have. let's make one if it's not on the feature list

---

## Round 6 – Follow-up questions

| ID | Question | Why it matters |
|---|---|---|
| FQ-15 | For the dashboard screen (BL-57), which stats do you want to show? Candidates: total active sponsorships, total donors, total children, total donated this month, total donated this year, recent donations list, number of donations needing attention. Which of these matter most to you, and are there others not listed? | Shapes the dashboard component design and the aggregate queries needed |
| FQ-16 | Once Stripe webhook integration is live and CSV import is retired from day-to-day use, should the CSV import UI be removed from the Admin tab, or kept as a hidden emergency tool? | Affects whether TICKET-091 (CSV import) is kept long-term or deprecated |

FQ-15. total active sponsorships, total active donors, total children actively sponosored out of total children available for sponosgrrhip, total donation this month. total donation for the year, number of donatoins needing attenteoin. i graph of total donatons over the last 12 months. Every item should be able to be toggled on and off per user logged in based on what they want to see. Their preference should be stored.
FQ-16. it should be kept as an emergency tool.

---

## Round 7 – Follow-up questions

| ID | Question | Why it matters |
|---|---|---|
| FQ-17 | Dashboard stat: "total children actively sponsored out of total children available for sponsorship" – what counts as "available for sponsorship"? Option A: all non-archived children (denominator = every child in the system). Option B: only children explicitly marked as seeking a sponsor. This affects whether the Child model needs an "available" flag. | Determines whether a new field is needed on the Child model |
| FQ-18 | The 12-month donations chart: should the Y-axis show total amount donated in dollars (sum of succeeded donation amounts) or count of donations? And for the amounts, gross (what donors paid including Stripe fee) or net (what the org received after fees)? | Shapes the chart query and what data to aggregate |

FQ-17. all non-archived childeren
FQ-18 i want the visual of total odnations and total amount in dollars. it should be net amount. this can be two seperate graphs or one depending on how you want to visualize the data.