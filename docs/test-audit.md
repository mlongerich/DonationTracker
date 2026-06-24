---
author: claude
created: 2026-06-24
updated: 2026-06-24
tags: [project, testing, audit]
status: open – findings to be addressed
---

# Test Audit – Business Rules vs Existing Tests

Audited 2026-06-24. All RSpec specs, Jest tests, and Cypress suites checked against BL-1 through BL-52.

Rules BL-42 through BL-51 and BL-53 through BL-62 excluded from audit scope (reporting, source field, dashboard, and preferences are all planned and not yet implemented).

**Audit framing:** tests are the live documentation of what the code does. Contradictions are cases where a test asserts behaviour that disagrees with a BL rule. Missing tests are noted separately.

---

## Contradictions – tests assert behaviour that conflicts with a BL rule

**[BL-44] `DELETE /api/donors/all` hard-deletes donor records**
`spec/requests/donors_spec.rb:282`
Test asserts: `DELETE /api/donors/all` decreases `Donor.count` by 3 — permanent hard deletion.
BL-44 says: no hard deletes of donor records. Soft-delete only. Data kept indefinitely.
Note: this endpoint is E2E test infrastructure and is production-guarded. BL-44 as written does not carve out this exception explicitly.

*Action needed: decide whether BL-44 applies to admin UI only (and test infrastructure is exempt), or whether BL-44 should explicitly name this as a permitted exception for test cleanup.*

---

**[BL-44] `DELETE /api/test/cleanup` hard-deletes both donors and donations**
`spec/requests/api/test_spec.rb:11`
Test asserts: after cleanup, both `Donation.count` and `Donor.count` reach zero — permanent hard deletion.
BL-44 says: no hard deletes of donor or donation records.
Note: endpoint has a production guard at lines 22-32 and is intentional test infrastructure. Same question as above.

*Action needed: same as above. Both findings resolve together.*

---

## Previous findings (missing tests, not contradictions)

**[BL-2] Email uniqueness is case-sensitive only**
`spec/models/donor_spec.rb:29`
BL-2 requires case-insensitive uniqueness. The test creates `test@example.com` and attempts to duplicate it with identical casing. No test verifies that `TEST@EXAMPLE.COM` or `Test@Example.Com` is rejected when `test@example.com` already exists.

Also missing: no test confirms that an archived donor's email can be reused by a new active donor. BL-2 explicitly excludes archived donors from the uniqueness check.

*Action:* make emails case-insensitive. if an non mailinator email comes back, un-archive the donor. mailinator has very specific rules on how it is used and generated. please go through them and check if there are any gaps, or unexpected side-effects.

---

**[BL-10] `bank_transfer` payment method never tested as valid**
`spec/models/donation_spec.rb:35-42`
BL-10 states valid payment methods are stripe, check, cash, and bank_transfer. The model spec tests only `stripe` as an explicit valid value and one invalid value. `cash` and `bank_transfer` have zero model spec coverage.

*Action:* we can add tests for it. i don'thave any back transfers in the system yet.

---

**[BL-22] Allowed case (different amount) not tested at sponsorship model layer**
`spec/models/sponsorship_spec.rb:66`
BL-22 prohibits duplicate active sponsorships with the same donor, child, and monthly_amount. The test at line 66 covers the identical-amount duplicate case. No test directly asserts that two sponsorships from the same donor to the same child at different monthly amounts are both permitted. The rule is only exercised implicitly via the donation model.

*Action:* 2026-05-04 - Liisa Kephart - Sponsor Paopaowalee payment happens twice. this is because she sponsors the same child twice as she wants to sponosor for $200 instead of once. this is currently in prod and works as expected. in terms of tests. should this not be possible? or are you saying it's only one sponosorship but multiple donations? is a sponorship amount matter for the features we are building?

---

**[BL-41] Dev login production restriction untested**
`spec/requests/auth_spec.rb:96-129`
BL-41 says the dev login endpoint must be unavailable in production. The existing tests verify it works in test and development environments. No test verifies that `GET /auth/dev_login` returns 404 or 403 when `Rails.env.production?` is true. The pattern for mocking production mode exists in `spec/requests/application_controller_spec.rb` but is not applied to the auth spec.

*Action:* apply to auth spec if possible

---

## Gaps – BL rules with no test coverage

**[BL-9] Donation without a donor is invalid**
No test. BL-9 lists donor as required. The model spec validates amount, date, and payment_method but does not assert that a nil `donor_id` makes the donation invalid.

*Action:* add test.

---

**[BL-11] Donation status editing and archiving untested at API layer**
No `PATCH /api/donations/:id` request spec exists. BL-11 says admins can edit status, edit needs_attention_reason, and archive a donation. None of these mutation paths are covered at the controller layer. The enum values are tested at the model level and the field appears in the presenter spec, but the endpoint itself has no coverage.

*Action:* cover in controller layer also.

---

**[BL-15] Stripe import idempotency (re-import skip) untested**
`spec/services/stripe_payment_import_service_spec.rb`
BL-15 says a CSV row is skipped when a StripeInvoice with that `stripe_invoice_id` already exists. The service spec covers other idempotency contexts (subscription_id + child_id) but contains no test that re-importing an already-processed row results in `skipped: 1` and zero new Donation or StripeInvoice records.

*Action:* fix.

---

**[BL-19] Child hard-delete restriction only tested with active sponsorship**
`spec/models/child_spec.rb:51`
BL-19 says a child cannot be hard deleted if ANY sponsorship exists, active or ended. The test at line 51 does not set `end_date` on the sponsorship, so it only covers the active case. No test verifies that a child with only an ended sponsorship (end_date set) also raises `DeleteRestrictionError`.

*Action:* add test.

---

**[BL-25] Sponsorship hard-delete restriction has no test**
`spec/models/sponsorship_spec.rb`
BL-25 says a sponsorship cannot be hard deleted if it has any donations. `has_donations?` is tested as a method, but `sponsorship.destroy` raising `ActiveRecord::DeleteRestrictionError` when donations exist is never asserted at either the model or the request layer.

*Action:* test

---

**[BL-37] Import service ended-sponsorship path untested**
`spec/services/stripe_payment_import_service_spec.rb`
BL-37 says that when a new Stripe payment arrives for a donor+child pair where the existing sponsorship has `end_date` set, the system must create a new Sponsorship record. The donation model layer has indirect coverage of this via `auto_create_sponsorship_from_child_id`. The import service has no test exercising this path when a CSV row arrives and the only existing sponsorship for that donor+child is ended.

*Action:* what is better to create a new sponosorship or reopen the old one. what are the trade-offs. do whatever is best.

---

**[BL-40] JWT 30-day default expiry unverified**
`spec/services/json_web_token_spec.rb`
The spec at line 27 tests that an expired token raises an error. No test calls `JsonWebToken.encode(payload)` without an explicit expiry and then asserts the decoded `exp` claim equals 30 days from now. The default expiry is assumed but not verified.

Also: `/api/health` returns 200 in the health spec without an Authorization header, but this runs in a context where authentication may be globally bypassed. No test verifies the health endpoint returns 200 in a production-auth-mode context (compare: application_controller_spec.rb uses `Rails.env.production?` mocking to test protected endpoints).

*Action:* test it if possible

---

**[BL-52] No schema assertion for absent `stripe_subscription_id` on Sponsorship**
`spec/models/sponsorship_spec.rb`
BL-52 says the Sponsorship model must not store a `stripe_subscription_id`. The column is correctly absent from the schema. No test asserts this explicitly, so a migration accidentally adding the column would go undetected.

*Action:* test it.

---

## Priority

### Fix now – behavioural risk

| Rule | Issue |
|---|---|
| BL-2 | Archived-donor email reuse affects donor merge and import flows |
| BL-11 | Entire status-edit and archive feature is untested at API layer |
| BL-15 | Import idempotency data integrity risk on CSV re-import |
| BL-25 | Sponsorship hard-delete restriction has no enforcement test |
| BL-37 | Import service ended-sponsorship path creates new record per BL but is untested |

### Fix soon – coverage completeness

| Rule | Issue |
|---|---|
| BL-9 | Missing donor-required validation test |
| BL-10 | Missing bank_transfer valid-value test |
| BL-19 | Ended-sponsorship child delete restriction not covered |
| BL-40 | JWT default expiry and health endpoint auth context |
| BL-41 | Dev login production restriction |

### Low priority – schema guard

| Rule | Issue |
|---|---|
| BL-52 | Schema is correct, just no regression guard |
