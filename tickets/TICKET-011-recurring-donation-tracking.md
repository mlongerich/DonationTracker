## [TICKET-011] Recurring Donation Tracking (Orthogonal to Projects)

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-006 (Donation model), TICKET-008 (Background jobs - if needed), TICKET-024 (Stripe integration provides subscription_id)

### User Story
As an admin, I want to track recurring donations and identify missed payments so that I can follow up with donors, regardless of which project the donation supports.

### Acceptance Criteria
- [ ] Backend: Add recurring fields to Donation (recurring:boolean, frequency:integer, expected_next_date:date, missed_payments_count:integer)
- [ ] Backend: Add Stripe subscription tracking (stripe_subscription_id:string)
- [ ] Backend: Use existing `status` column for donation state (migration already has this field)
- [ ] Backend: Calculate expected_next_date based on frequency (monthly, quarterly, annually)
- [ ] Backend: Background job CheckMissedPaymentsJob (Sidekiq)
- [ ] Backend: Update status based on overdue days (late, overdue, at_risk, cancelled)
- [ ] Backend: GET /api/donations/overdue endpoint for admin dashboard
- [ ] Backend: Increment missed_payments_count for overdue donations
- [ ] Backend: Webhook handles subscription cancellations (updates status to cancelled)
- [ ] Frontend: Recurring checkbox in DonationForm
- [ ] Frontend: Frequency dropdown (one-time, monthly, quarterly, annually)
- [ ] Frontend: Overdue donations dashboard
- [ ] RSpec tests for date calculations and status logic (8+ tests)
- [ ] Background job tests with Sidekiq testing mode

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Orthogonal Design**: Recurring status is independent of project assignment
  - Any donation can be recurring (general, campaign, or sponsorship)
  - Project categorizes "what," recurring tracks "when/how often"
- **Migration**: `rails g migration AddRecurringToDonations recurring:boolean frequency:integer expected_next_date:date missed_payments_count:integer stripe_subscription_id:string`
- **Uses existing column**: `status` column already exists in schema (line 21 of schema.rb)
- **Frequency enum**: `enum frequency: { one_time: 0, monthly: 1, quarterly: 2, annually: 3 }`
- **Status enum**: `enum status: { active: 0, late: 1, overdue: 2, at_risk: 3, cancelled: 4 }`
- **Date calculation**:
  - monthly: `+1.month`
  - quarterly: `+3.months`
  - annually: `+1.year`
- **Job schedule**: Daily at midnight via Sidekiq cron (or whenever gem for scheduled jobs)
- **Status transitions**:
  - 1-7 days late: `late`
  - 8-30 days: `overdue` (increment missed_payments_count)
  - 31-90 days: `at_risk`
  - 90+ days: `cancelled`
- **Stripe Integration**:
  - Detect recurring from `stripe_subscription_id` presence
  - Automatic cancellation via webhook `customer.subscription.deleted`
  - Frequency extracted from Stripe plan interval
- **Example queries**:
  - `Donation.where(recurring: true, project: general_project)` (recurring general donations)
  - `Donation.where(status: [:late, :overdue])` (all late donations across projects)

### Files Changed
- Backend: `db/migrate/..._add_recurring_to_donations.rb` (new)
- Backend: `app/models/donation.rb` (update)
- Backend: `app/jobs/check_missed_payments_job.rb` (new)
- Backend: `app/controllers/api/donations_controller.rb` (add overdue action)
- Backend: `spec/jobs/check_missed_payments_job_spec.rb` (new)
- Frontend: `src/components/DonationForm.tsx` (update)
- Frontend: `src/components/OverdueDonationsDashboard.tsx` (new)

### Related Commits
- (To be added during commit)
