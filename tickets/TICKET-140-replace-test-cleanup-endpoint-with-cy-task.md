---
author: both
created: 2026-06-24
updated: 2026-06-24
tags: [project, ticket, testing, e2e, infrastructure]
---

# Epic 7 – TICKET-140: Replace HTTP test cleanup endpoint with cy.task

**Parent epic:** [[epic-7-test-coverage]]
**Status:** Not started
**Depends on:** none
**Unblocks:** none

---

## Business context

**Problem / user story**
E2E test database cleanup currently happens via two HTTP endpoints (`DELETE /api/test/cleanup` and `DELETE /api/donors/all`) that hard-delete records inside the application. This violates BL-44 (no hard deletes of donor or donation records) and embeds test infrastructure into production application code, even with environment guards. The correct pattern is to move cleanup to the Cypress Node layer where it runs outside the API entirely.

**Scope boundary**
Delivers: removal of both test-only HTTP endpoints and replacement with a `cy.task('db:clean')` backed by a Rails Rake task, so E2E tests clean the database without touching the API.
Does not deliver: changes to any E2E test assertions, test data factories, or test behaviour beyond how cleanup is invoked.

**Acceptance criteria**
1. `DELETE /api/test/cleanup` route and TestController are deleted from the Rails app.
2. The `destroy_all` action and its route (`DELETE /api/donors/all`) are deleted from DonorsController.
3. A Rake task `rake test:cleanup` exists in the Rails app, is guarded against production, and deletes all donations, sponsorships, donors, children, and non-system projects in correct foreign-key order.
4. `cypress.config.ts` defines a `db:clean` task that invokes the Rake task via `execSync` and returns null.
5. `cy.clearDonors()` in `cypress/support/commands.ts` is replaced with `cy.task('db:clean')`.
6. All Cypress test files that call `cy.clearDonors()` or `cy.request('DELETE', .../api/test/cleanup)` are updated to use `cy.task('db:clean')`.
7. All existing E2E tests pass after the change.
8. The RSpec test for `DELETE /api/test/cleanup` (`spec/requests/api/test_spec.rb`) is deleted.
9. The RSpec test for `DELETE /api/donors/all` (`spec/requests/donors_spec.rb:282`) is deleted.

---

## UX requirements

*No user-facing UI. Section omitted.*

---

## Technical constraints

**API / data contracts**
No new HTTP endpoints. The two endpoints being removed are:
- `DELETE /api/test/cleanup` (TestController#cleanup)
- `DELETE /api/donors/all` (DonorsController#destroy_all)

Both routes must be removed from `config/routes.rb`.

**Patterns to follow**
Rake task location: `lib/tasks/test.rake`. Guard pattern matches TestController: raise or return early if `Rails.env.production?`. Delete order must match the existing TestController to avoid foreign key violations:
```
Donation.delete_all
Sponsorship.delete_all
Donor.delete_all
Child.delete_all
Project.where(system: false).delete_all
```

Cypress task registration goes in the empty `setupNodeEvents` block already present in `cypress.config.ts`:
```typescript
import { execSync } from 'child_process'

setupNodeEvents(on, config) {
  on('task', {
    'db:clean': () => {
      execSync(
        'docker-compose exec -T api bundle exec rake test:cleanup RAILS_ENV=test',
        { cwd: process.cwd() }
      )
      return null
    }
  })
}
```

`cy.clearDonors()` custom command in `cypress/support/commands.ts` should be renamed to `cy.cleanDb()` and call `cy.task('db:clean')` to maintain a named command for use in test files. Update `cypress/support/index.d.ts` accordingly.

**Architecture decisions**
The Rake task runs inside the Docker API container via `docker-compose exec -T`. This keeps cleanup logic in Ruby alongside the models, avoids adding a Node Postgres client dependency, and works consistently with how the test server is already started in the E2E lifecycle.

---

## Quality requirements

**Test scenarios**
- Run `bash scripts/test-backend.sh` to establish baseline passing count before starting.
- After removing the endpoints, run full RSpec suite and confirm no previously passing tests now fail (only the two deleted spec files should disappear from the count).
- Run `npm run cypress:e2e` and confirm all Cypress tests pass end-to-end with the new cleanup mechanism.
- Manually trigger `cy.task('db:clean')` in a Cypress test context and confirm the database is empty afterward (donations, donors, children, sponsorships all zero; system projects preserved).

**Edge cases**
- The Rake task must not run in production. Guard with `raise "Not available in production" if Rails.env.production?` at the top of the task body.
- `docker-compose exec -T` uses the `-T` flag to disable pseudo-TTY allocation, which is required for non-interactive use from Node's `execSync`.
- If the Docker API container is not running when `cy.task('db:clean')` is called, `execSync` will throw. The existing E2E lifecycle (`npm run cypress:e2e`) already starts the API before Cypress runs, so this is not expected to occur in normal use.
- `cy.task()` must return a value (null is acceptable). A task that returns undefined causes Cypress to throw.

---

## Security considerations

Removing the HTTP endpoints reduces the application's attack surface. The production guard that existed on the old endpoints is replaced by the Rake task guard. No new input validation is required since `cy.task` calls are not HTTP-facing.

---

## Implementation notes

*(Decisions made, surprises encountered, shortcuts taken under pressure. Leave blank before work starts.)*

---

## Post-ticket check

- [ ] Acceptance criteria met — verify each criterion.
- [ ] All automated tests for this ticket pass.
- [ ] If this ticket touched the dashboard UI: every interaction verified against `dashboard-design-guide.md`. New patterns added to the guide before committing.
- [ ] If any test broke during this ticket: root cause fixed (not the test). Finding logged.
- [ ] **Bubble up** — Did this ticket reveal anything that changes the epic scope, spec, business logic, or future ticket scope? If yes: update the epic file, `super-spec.md`, or affected ticket files now. Do not carry this forward.
- [ ] **Diffuse down** — Did this ticket establish new patterns, API contracts, or architectural decisions that the next ticket depends on? If yes: update the next ticket's Technical constraints section now, before work on it begins.
- [ ] `notes.md` updated with anything unexpected.
- [ ] Work committed.
- **Notify Michael: state which ticket is done, what was delivered, and what the next ticket is. Stop here.**
