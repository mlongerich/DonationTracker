---
author: both
created: 2026-06-24
updated: 2026-06-24
tags: [project, epic]
---

# Epic 1 — Donation Management Completion

**Project:** [[development-process]]
**Status:** Not started
**Depends on:** TICKET-140 (standalone pre-work ticket — not part of any epic; cy.cleanDb must exist before any E2E tests for this epic are written)
**Unblocks:** Epic 3 (source column required), Epic 4 (stripe_fee_cents required)

---

## Business context

**Problem**
Donation management is incomplete in four ways. There is no way to edit or delete a donation after creation. Stripe-imported records are not distinguished from manually created ones, so the read-only rules in BL-60 cannot be enforced. The `stripe_fee_cents` field required for net amount reporting (Epic 4) does not exist. And case-insensitive email matching (BL-2) has a gap at the database index level that can allow duplicate donors under different email capitalisation.

**Goal**
Admin can create a donation, edit its status and notes, delete it within 24 hours of creation, and see Stripe-sourced records clearly marked as read-only. The data model is complete and correct so downstream epics (webhook, reports) can build on it without rework.

**Scope boundary**
Delivers: full donation CRUD with source tracking, read-only enforcement for Stripe records, BL-2 email fix, Pending Review tab edit actions, and test gap closure.
Does not deliver: admin override for deletion past the 24-hour window (TICKET-106, deferred), sponsorship source tracking (Epic 2 or later), Stripe fee display in reports (Epic 4).

**Acceptance criteria**
- Admin creates a donation via the UI.
- Admin edits status and needs_attention_reason on any manually created donation.
- Admin deletes a donation created within the last 24 hours. Deletion is prevented after 24 hours.
- A donation imported from Stripe CSV renders all data fields as read-only. The edit and delete controls are hidden.
- A source badge is visible on every donation (Manual, Stripe CSV, Stripe Webhook).
- Existing CSV-imported donations are backfilled to source stripe_csv. Manually created records are backfilled to manual.
- Admin updates donation status from the Pending Review tab.
- Admin edits needs_attention_reason and archives a donation from the Pending Review tab.
- Two donors cannot share the same email address regardless of capitalisation.
- An archived donor is restored when a non-mailinator email matching their record is presented on import.

---

## UX requirements

**UX principles for this epic**
Follow the existing card-and-inline-edit pattern from `docs/design-guide.md`. Read-only Stripe records must be visually distinct — the admin should immediately understand they cannot be edited without needing to try. No new full-page views introduced.

**Key interactions**

*Source badge:* Every donation card shows a `Chip size="small"` with the source label and a semantic colour (Manual: default, Stripe CSV: info, Stripe Webhook: secondary). Defined in `src/utils/source.ts`. Must be documented in `docs/design-guide.md` before this epic closes.

*Read-only donation card:* When `donation.source` is `stripe_csv` or `stripe_webhook`, the edit `IconButton` is hidden and a lock icon or "Stripe" label communicates the read-only state. No separate read-only form — the card simply never renders edit controls.

*Delete button:* Appears only when `donation.can_be_deleted === true` (backend flag). Uses `DeleteIcon` with `Tooltip title="Delete donation (within 24 hours only)"`. Confirmation via `StandardDialog` per the dialog pattern in `docs/design-guide.md`.

---

## Technical constraints

**Thin slice**
Schema migrations run, source values backfill correctly, PATCH and DELETE endpoints enforce business rules, the frontend renders editable or read-only controls based on source, and all paths are covered by tests — delivered end-to-end before this epic closes.

**Architecture decisions**

*Source field:* String column on donations, not null, default `manual`. Values: `stripe_csv`, `stripe_webhook`, `manual`. These are the BL-53 canonical values. TICKET-118 was written with `csv_import` — that must be updated to `stripe_csv` before implementation. Use a Rails enum for validation, not a check constraint.

*stripe_fee_cents:* Nullable integer on donations. Written by `StripePaymentImportService` from the CSV Fee column. Nil for manual donations. No UI input — backend-only for now.

*Read-only enforcement:* Enforced at both layers. API: `PATCH /api/donations/:id` returns 422 if `source` is not `manual`. Frontend: edit and delete controls rendered only when `source == 'manual'` and `can_be_deleted == true` respectively. Never rely on frontend-only guard.

*PATCH scope:* Only `status` and `needs_attention_reason` are editable. All other fields (amount, date, donor, project, source) are permanently locked after creation regardless of source.

*DELETE scope:* 24-hour window enforced in `Donation#can_be_deleted?` on the model. Backend returns 422 with `{ error: "Cannot delete donation older than 24 hours" }` if the window has passed. `DonationPresenter` includes `can_be_deleted` boolean.

*BL-2 email fix:* Change the uniqueness index on `donors.email` to case-insensitive (PostgreSQL `lower()` functional index or citext extension). The model validation already has `case_sensitive: false`. The gap is at the DB level only. Un-archive logic: `DonorService#find_existing_donor` must scope to include discarded records, and `create_or_update_donor` must call `undiscard` when the matched record is archived and the incoming email is not a mailinator address.

*Controller pattern:* Use `save!`/`update!` and global error handlers per existing pattern. No if/rescue in controller actions for RecordNotFound or RecordInvalid.

*Dialog pattern:* Confirmation dialogs use `StandardDialog` not bare `Dialog`. This affects TICKET-086's implementation notes (that ticket was written before StandardDialog existed).

**Dependencies**
TICKET-140 must be complete before any E2E tests for this epic are written, so all new Cypress tests use `cy.cleanDb()`.

**Spike**
None. All decisions resolved in super-spec.md and ADRs.

---

## Quality requirements

**Testing strategy**
TDD for all backend changes. Jest for all new React components and utilities. Cypress E2E for the full create-edit-delete flow and the read-only enforcement path.

**Testing requirements**
- Model specs: `can_be_deleted?` true/false, source enum validation, BL-2 uniqueness at DB level
- Request specs: PATCH (success, stripe source rejection, invalid field rejection), DELETE (success within 24h, 422 after 24h, 404 not found), source field on create
- Service specs: `StripePaymentImportService` sets `source: stripe_csv` and writes `stripe_fee_cents`
- Jest: source badge renders with correct colour, delete button visibility based on `can_be_deleted`, delete confirmation flow
- Cypress E2E: create donation → edit status → delete within 24h; CSV-imported record shows no edit controls

---

## Security considerations

PATCH enforced at the API level — frontend read-only is a UX convenience, not a security boundary. The backend rejects edits to non-manual records regardless of what the frontend sends.

BL-2 fix: the DB-level unique index on `lower(email)` prevents duplicate donors from being created via raw SQL or bulk imports that bypass model validations.

---

## Tickets

Refine each ticket to full detail just before implementation by reading the current codebase first. TICKET-118 and TICKET-086 are existing files that need updating before implementation: TICKET-118 must correct source values from `csv_import` to `stripe_csv`; TICKET-086 must update controller pattern (global error handler) and dialog pattern (StandardDialog).

| Ticket | Scope | Signal | File | Status |
|---|---|---|---|---|
| TICKET-118 | source column migration + backfill + Donation enum + StripePaymentImportService + DonationPresenter | CSV import creates donation with source stripe_csv; backfill assigns correct values to all existing records | TICKET-118-donation-source-tracking.md | Not started |
| TICKET-141 | stripe_fee_cents migration (nullable integer) + StripePaymentImportService writes fee from CSV Fee column | CSV row with fee creates donation with correct stripe_fee_cents; nil for manual | (new) | Not started |
| TICKET-142 | PATCH /api/donations (status + needs_attention_reason, rejects non-manual source) + frontend edit button and form + read-only card display for Stripe records | PATCH returns 422 for stripe_csv source; edit button hidden on stripe_csv card | (new) | Not started |
| TICKET-086 | DELETE /api/donations (24-hour window, can_be_deleted? model method, DonationPresenter flag) + frontend delete button + StandardDialog confirmation | DELETE returns 204 within 24h; DELETE returns 422 after; delete button hidden when can_be_deleted false | TICKET-086-delete-donation-24-hour-window.md | Not started |
| TICKET-115 | Pending Review tab: edit donation status action | Admin changes status from needs_attention to succeeded in Pending Review tab | TICKET-115-admin-edit-donation-status.md | Not started |
| TICKET-116 | Pending Review tab: edit needs_attention_reason + archive action | Admin edits reason text and archives donation from Pending Review tab | TICKET-116-admin-archive-donations.md | Not started |
| TICKET-143 | BL-2: case-insensitive unique index on donors.email + DonorService un-archive logic | Two donors with same email different capitalisation rejected at DB; archived donor restored on non-mailinator email match | (new) | Not started |
| TICKET-144 | Test gaps: BL-9, BL-10, BL-11, BL-15, BL-41 | Five new specs exist and pass in the backend suite | (new) | Not started |

**Files to create or modify (summary)**

Backend:
- `db/migrate/` — source column, stripe_fee_cents column, email index change
- `app/models/donation.rb` — source enum, can_be_deleted?
- `app/models/donor.rb` — no change needed (validation already case_sensitive: false)
- `app/controllers/api/donations_controller.rb` — PATCH, DELETE actions
- `app/services/stripe_payment_import_service.rb` — write source and stripe_fee_cents
- `app/services/donor_service.rb` — un-archive logic
- `app/presenters/donation_presenter.rb` — source, can_be_deleted
- `spec/models/donation_spec.rb` — new specs
- `spec/models/donor_spec.rb` — BL-2 specs
- `spec/requests/api/donations_spec.rb` — PATCH, DELETE specs
- `spec/services/stripe_payment_import_service_spec.rb` — source, fee specs
- `spec/services/donor_service_spec.rb` — un-archive specs

Frontend:
- `src/types/donation.ts` — source, can_be_deleted fields
- `src/utils/source.ts` — new: getSourceLabel, getSourceColor
- `src/components/DonationList.tsx` — source badge, conditional edit/delete controls
- `src/components/DonationList.test.tsx` — new specs
- `src/pages/DonationsPage.tsx` — edit/delete handlers
- `src/pages/AdminPage.tsx` — TICKET-115/116 changes

---

## Post-epic gate

- [ ] All ticket post-ticket checks complete.
- [ ] All tests pass — full suite, not just touched files.
- [ ] Linter passes — `bundle exec rubocop` on all touched backend files, `npm run lint` on all touched frontend files.
- [ ] **Refactor gate complete** — dead code removed; cross-ticket duplication resolved; no speculative abstractions. Before running: check `docs/code-style.md` Code smells section. After running: update `docs/code-style.md` Refactoring log with any changes made.
- [ ] Code style guide updated — new `source` badge pattern documented in `docs/design-guide.md` Chips section. Read-only card pattern documented.
- [ ] Spec drift check — any findings that contradict or extend the spec updated in `docs/super-spec.md` and `docs/business-logic.md` before next epic begins.
- [ ] **Bubble up** — Did this epic reveal anything that changes the implementation plan, future epic scope or ordering, or the overall product spec? If yes: update `docs/implementation-plan.md` and affected epic files now.
- [ ] **Diffuse down** — Did this epic establish new API contracts or data models that Epic 3 or Epic 4 depend on? If yes: update those epics' Technical constraints sections now.
- [ ] Retrospective note logged in `docs/notes.md` under "2026-XX-XX — Epic 1 retrospective".
