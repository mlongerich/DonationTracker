---
author: both
created: 2026-06-24
updated: 2026-06-24
tags: [project, ticket, testing, e2e, infrastructure]
---

# Epic 2 — T1: Replace HTTP test cleanup endpoint with cy.task

**Parent epic:** [[epic-2-sponsorship-lifecycle]]
**Status:** Not started
**Depends on:** none
**Unblocks:** Epic 1 (E2E tests written during Epic 1 should use cy.cleanDb() from the start)

---

## Business context

**Problem / user story**
E2E test database cleanup happens via two HTTP endpoints baked into the application: `DELETE /api/test/cleanup` (TestController) and `DELETE /api/donors/all` (DonorsController). Both hard-delete records inside the API. This contradicts BL-44 (no hard deletes of donor or donation records via the application) and exposes test infrastructure through HTTP, even with environment guards. The correct pattern is to move cleanup to the Cypress Node layer where it executes outside the API entirely.

**Scope boundary**
Delivers: removal of both test-only HTTP endpoints and replacement with a `cy.task('db:clean')` command backed by a Rails Rake task, so E2E tests clean the database without touching the API.
Does not deliver: changes to any E2E test assertions, test data factories, or test behaviour beyond how cleanup is invoked.

**Acceptance criteria**
1. `DELETE /api/test/cleanup` route and `Api::TestController` are deleted from the Rails app.
2. The `destroy_all` action and its route (`DELETE /api/donors/all`) are deleted from `Api::DonorsController`.
3. Both routes are removed from `config/routes.rb`.
4. A Rake task `rake test:cleanup` exists in `lib/tasks/test.rake`, guarded against production, and deletes all donations, sponsorships, donors, children, and non-system projects in the correct foreign-key order.
5. `cypress.config.ts` defines a `db:clean` task that invokes the Rake task via `execSync` and returns null.
6. `cy.cleanDb()` replaces `cy.clearDonors()` in `cypress/support/commands.ts` and calls `cy.task('db:clean')`.
7. `cypress/support/index.d.ts` is updated to declare `cleanDb` (removing `clearDonors`).
8. All Cypress test files that call `cy.clearDonors()` or `cy.request('DELETE', .../api/test/cleanup)` are updated to use `cy.cleanDb()`.
9. All existing E2E tests pass after the change.
10. `spec/requests/api/test_spec.rb` is deleted.
11. The RSpec example for `DELETE /api/donors/all` in `spec/requests/api/donors_spec.rb` is deleted.

---

## UX requirements

*No user-facing UI. Section omitted.*

---

## Technical constraints

**API / data contracts**
No new HTTP endpoints. Two endpoints removed:
- `DELETE /api/test/cleanup` (Api::TestController#cleanup)
- `DELETE /api/donors/all` (Api::DonorsController#destroy_all)

Both routes removed from `config/routes.rb`.

**Patterns to follow**

Rake task — `lib/tasks/test.rake`. Production guard and delete order must match the existing TestController exactly to avoid foreign key violations:

```ruby
namespace :test do
  desc "Clean database for E2E tests"
  task cleanup: :environment do
    raise "Not available in production" if Rails.env.production?

    Donation.delete_all
    Sponsorship.delete_all
    Donor.delete_all
    Child.delete_all
    Project.where(system: false).delete_all
  end
end
```

Cypress config — `cypress.config.ts` runs from `donation_tracker_frontend/`. The docker-compose.yml is one level up at the repo root. Use `path.resolve(process.cwd(), '..')` for the `cwd` option so `docker-compose exec` finds the correct compose file:

```typescript
import { defineConfig } from 'cypress';
import { execSync } from 'child_process';
import path from 'path';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      apiUrl: 'http://localhost:3002',
      devApiUrl: 'http://localhost:3001',
      testApiUrl: 'http://localhost:3002',
    },
    setupNodeEvents(on, config) {
      on('task', {
        'db:clean': () => {
          execSync(
            'docker-compose exec -T api bundle exec rake test:cleanup RAILS_ENV=test',
            { cwd: path.resolve(process.cwd(), '..') }
          );
          return null;
        },
      });
      return config;
    },
  },
});
```

Custom command — `cypress/support/commands.ts`. Rename `cy.clearDonors` to `cy.cleanDb`:

```typescript
Cypress.Commands.add('cleanDb', () => {
  cy.task('db:clean');
});
```

**Architecture decisions**
The Rake task runs inside the Docker API container via `docker-compose exec -T`. This keeps cleanup logic in Ruby alongside the models, avoids adding a Node Postgres client, and is consistent with how the test server already starts in the E2E lifecycle. The `-T` flag disables pseudo-TTY allocation, required for non-interactive use from Node's `execSync`.

`cy.task()` must return a value. Returning `undefined` causes Cypress to throw. The task returns `null`.

---

## Quality requirements

**Test scenarios**
- Establish a passing baseline with `bash scripts/test-backend.sh` before starting.
- After removing the endpoints, run the full RSpec suite. Only the two deleted spec files should disappear from the count. No previously passing tests should fail.
- Run `npm run cypress:e2e` and confirm all Cypress tests pass with the new cleanup mechanism.
- Verify `cy.cleanDb()` leaves donations, donors, children, and sponsorships at zero rows. System projects must remain.

**Edge cases**
- If the Docker API container is not running when `cy.task('db:clean')` fires, `execSync` will throw. The existing `npm run cypress:e2e` lifecycle starts the API before Cypress runs, so this should not occur in normal use.
- `cy.task()` returning `undefined` throws in Cypress. Task must explicitly `return null`.

---

## Security considerations

Removing the HTTP endpoints reduces the application attack surface. The production guard on the old endpoints is replaced by the Rake task guard. No new input validation needed since `cy.task` calls are not HTTP-facing.

---

## Implementation notes

*(Decisions made, surprises encountered, shortcuts taken under pressure. Leave blank before work starts.)*

---

## Post-ticket check

- [ ] Acceptance criteria met — verify each criterion.
- [ ] All automated tests for this ticket pass.
- [ ] If this ticket touched the dashboard UI: every interaction verified against `docs/design-guide.md`. New patterns added to the guide before committing.
- [ ] If any test broke during this ticket: root cause fixed (not the test). Finding logged.
- [ ] **Bubble up** — Did this ticket reveal anything that changes the epic scope, spec, business logic, or future ticket scope? If yes: update the epic file, `docs/super-spec.md`, or affected ticket files now. Do not carry this forward.
- [ ] **Diffuse down** — Did this ticket establish new patterns, API contracts, or architectural decisions that the next ticket depends on? If yes: update the next ticket's Technical constraints section now, before work on it begins.
- [ ] `docs/notes.md` updated with anything unexpected.
- [ ] Work committed.
- **Notify Michael: state which ticket is done, what was delivered, and what the next ticket is. Stop here.**
