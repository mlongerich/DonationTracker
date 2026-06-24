---
author: both
created: 2026-06-24
updated: 2026-06-24
tags: [project, ticket, testing, e2e, infrastructure]
---

# Standalone — TICKET-140: Replace HTTP test cleanup endpoints with cy.task

**Parent epic:** none (infrastructure prerequisite — must complete before Epic 1 and Epic 2 E2E work begins)
**Status:** Not started
**Depends on:** none
**Unblocks:** Epic 1 E2E tests, Epic 2 E2E tests

---

## Business context

**Problem / user story**
E2E test database cleanup happens via two HTTP endpoints baked into the Rails application. Both hard-delete records via the API, which contradicts BL-44 (no hard deletes via the application). Test infrastructure should not exist in the application layer. It belongs in the Cypress Node layer where it runs outside the API entirely.

**Scope boundary**
Delivers: removal of both test-only HTTP endpoints, replacement with a Cypress `cy.task` backed by a Rails Rake task.
Does not deliver: changes to any E2E test assertions, test data factories, or test behaviour beyond how cleanup is invoked.

**Acceptance criteria**
1. `DELETE /api/test/cleanup` route and `Api::TestController` no longer exist in the Rails app.
2. The `destroy_all` action and its route (`DELETE /api/donors/all`) no longer exist in `Api::DonorsController`.
3. Both routes are removed from `config/routes.rb`.
4. A Rake task at `lib/tasks/test.rake` exists, is protected from running in production, and deletes all donations, sponsorships, donors, children, and non-system projects in the correct order to satisfy foreign key constraints.
5. `cypress.config.ts` defines a `db:clean` task that invokes the Rake task inside the running Docker API container and returns null.
6. `cy.cleanDb()` exists in `cypress/support/commands.ts` as a named command that calls `cy.task('db:clean')`.
7. `cypress/support/index.d.ts` declares `cleanDb` and no longer declares `clearDonors`.
8. All Cypress test files that previously called `cy.clearDonors()` or the HTTP cleanup endpoint call `cy.cleanDb()` instead.
9. All existing E2E tests pass with the new cleanup mechanism.
10. `spec/requests/api/test_spec.rb` is deleted.
11. The RSpec example covering `DELETE /api/donors/all` is deleted from `spec/requests/api/donors_spec.rb`.

---

## UX requirements

*No user-facing UI. Section omitted.*

---

## Technical constraints

**API / data contracts**
No new HTTP endpoints. The two endpoints being removed:
- `DELETE /api/test/cleanup`
- `DELETE /api/donors/all`

**Patterns to follow**
- Rake task lives at `lib/tasks/test.rake`. Production guard follows the same pattern used by the existing TestController.
- Delete order must satisfy the existing foreign key constraints. The correct order is: Donation, Sponsorship, Donor, Child, non-system Projects. This matches the order used in the existing TestController and must be preserved.
- The Cypress task is registered in the `setupNodeEvents` block already present in `cypress.config.ts`.
- The task must return `null` explicitly. Cypress throws if a task returns `undefined`.
- The Rake task is invoked via `docker-compose exec` into the running API container. The working directory for the shell command must resolve to the repo root, not the `donation_tracker_frontend/` directory that Cypress runs from.
- `cy.cleanDb()` replaces `cy.clearDonors()`. Update all call sites and the TypeScript declaration file.

**Architecture decisions**
Keeping cleanup logic in Ruby (via Rake) means the cleanup respects the same model and FK structure as the app, avoids adding a Node database client dependency, and stays consistent with how the test API container is already managed by the E2E lifecycle scripts.

---

## Quality requirements

**Test scenarios**
- Establish a passing baseline with the backend test suite before starting.
- After removing the endpoints, the full RSpec suite passes. Only the two deleted spec files disappear from the count.
- All Cypress E2E tests pass end-to-end with the new cleanup mechanism.
- After `cy.cleanDb()` runs, the database has zero donations, donors, children, and sponsorships. System projects are preserved.

**Edge cases**
- `cy.task()` must return `null`, not `undefined`.
- The `-T` flag is required on `docker-compose exec` for non-interactive use from Node. Without it, the command may hang waiting for a TTY.
- If the API container is not running when the task fires, the execSync call will throw. The existing E2E lifecycle starts the API before Cypress, so this should not occur in normal use.

---

## Security considerations

Removing the HTTP endpoints reduces attack surface. The production guard on the existing endpoints is replaced by the Rake task guard. No new HTTP surface is introduced.

---

## Implementation notes

*(Leave blank before work starts.)*

---

## Post-ticket check

- [ ] Acceptance criteria met — verify each criterion.
- [ ] All automated tests for this ticket pass.
- [ ] If this ticket touched the dashboard UI: every interaction verified against `docs/design-guide.md`. New patterns added to the guide before committing.
- [ ] If any test broke during this ticket: root cause fixed (not the test). Finding logged.
- [ ] **Bubble up** — Did this ticket reveal anything that changes the epic scope, spec, business logic, or future ticket scope? If yes: update the relevant files now. Do not carry this forward.
- [ ] **Diffuse down** — Did this ticket establish new patterns, API contracts, or architectural decisions that the next ticket depends on? If yes: update the next ticket's Technical constraints section now, before work on it begins.
- [ ] `docs/notes.md` updated with anything unexpected.
- [ ] Work committed.
- **Notify Michael: state which ticket is done, what was delivered, and what the next ticket is. Stop here.**
