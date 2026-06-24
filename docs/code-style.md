---
author: claude
created: 2026-06-24
updated: 2026-06-24
tags: [project, process, code-style]
---

# Donation Tracker – Code Style Guide

Living document. Starts with universal principles and the linting setup. Updated whenever a new pattern emerges, an anti-pattern is identified, or a refactoring decision is made. Read this before writing any code. Consult it when reviewing code before marking a ticket done.

---

## Universal principles

**SOLID**
Each module or class has one reason to change (Single Responsibility). Code is open for extension but closed for modification (Open/Closed). Subtypes can substitute for their base types without breaking callers (Liskov). Prefer many focused interfaces over one general one (Interface Segregation). Depend on abstractions, not concretions (Dependency Inversion).

**DRY – Don't Repeat Yourself**
Every piece of knowledge has a single, unambiguous representation in the codebase. When the same logic appears in two places, one of them is wrong. Extract it.

**KISS – Keep It Simple**
The simplest solution that works is the right solution. Complexity that the current problem does not require is not cleverness. It is future debt.

**YAGNI – You Aren't Gonna Need It**
Do not build for hypothetical future requirements. Build for what the spec says now. If a future requirement arrives, add it then with full context.

**Progressive refactoring**
When a new pattern is established, do not go out of scope to back-apply it across the codebase. Refactor a file when it is already being touched for a ticket or epic. Files outside current scope are an accepted trade-off and will be addressed naturally over time.

The exception is a failing test. If a change causes a test to break in a file not originally in scope, that test has revealed an implicit dependency. That file is now in scope. Fix the root cause. Do not patch the test to silence it.

**Make the change easy, then make the easy change**
When a new feature requires a structural refactor, do the refactor first within the same ticket. Do not carry structural debt into the feature code itself.

---

## Linting and formatting

All code must pass linting before a ticket is marked done. Format before every commit.

### Backend

| Tool | Purpose | Command |
|---|---|---|
| RuboCop | Style, formatting | `docker-compose exec api bundle exec rubocop` |
| Brakeman | Security scanning | `docker-compose exec api bundle exec brakeman` |
| Reek | Code smell detection | `docker-compose exec api bundle exec reek` |
| RubyCritic | Quality score (target 95+) | `docker-compose exec api bundle exec rubycritic` |

Configuration: `.rubocop.yml` (inherits rubocop-rails-omakase, adds `Style/WordArray: percent`)

**Word arrays:** Use `%w[]` syntax, not `["a", "b"]`, for arrays of simple strings. Enforced by RuboCop.

### Frontend

| Tool | Purpose | Command |
|---|---|---|
| ESLint | Lint TypeScript and React | `npm run lint` |
| ESLint --fix | Auto-fix lint violations | `npm run lint:fix` |
| Prettier | Format | `npm run format` |

ESLint config: `eslintConfig` in `package.json` (extends react-app, prettier plugin).

---

## Naming conventions

| Context | Convention | Example |
|---|---|---|
| Rails controllers | Module-namespaced under `Api::` | `Api::DonorsController` |
| Rails service objects | Suffix `Service`, noun phrase | `DonorService`, `StripePaymentImportService` |
| Rails presenter objects | Suffix `Presenter` | `DonorPresenter`, `CollectionPresenter` |
| Rails concerns | Noun or adjective phrase | `PaginationConcern`, `RansackFilterable` |
| Rails jobs | Suffix `Job` | `StripeWebhookJob` |
| React components | PascalCase file and export | `DonorForm.tsx`, `SponsorshipList.tsx` |
| React custom hooks | Prefix `use`, camelCase | `useDonors`, `useDebounce` |
| React types | Interface for object shapes, type for unions | `interface Donor`, `type ProjectType` |
| Type files | Domain-named in `src/types/` | `donor.ts`, `pagination.ts` |
| Cypress commands | camelCase in `commands.ts` | `cy.login()`, `cy.cleanDb()` |

---

## Design patterns in use

Each entry names the pattern, the primary file location, and the reason it was chosen. New code in the same area follows the same pattern unless there is a documented reason not to.

| Pattern | Where used | Why |
|---|---|---|
| Service object | `app/services/` | Multi-step workflows, internal state, testable in isolation |
| Presenter | `app/presenters/` | Complex JSON serialisation, decouples view logic from model |
| Controller concern | `app/controllers/concerns/` | Pagination and Ransack filtering used in 3+ controllers |
| Global error handling | `ApplicationController` rescue handlers | Happy-path controllers, consistent HTTP error codes |
| Ransack whitelist | Each model `ransackable_attributes` | Prevents SQL injection via query param manipulation |
| Soft delete | Discard gem on Donor, Child, Project | Data retention policy, can_be_deleted? guard |
| Hard-delete restriction | `dependent: :restrict_with_exception` | Prevent accidental data loss via parent delete |
| Pagination | Kaminari via `PaginationConcern` | Consistent pagination meta across all list endpoints |
| Currency in cents | DB integer, display converted | Integer math avoids floating-point errors |
| JWT authentication | `JsonWebToken` service + ApplicationController | Stateless API auth for single-tenant admin app |
| Barrel exports | `src/types/index.ts`, `src/hooks/index.ts` | Single import point, avoids deep relative paths |
| Entity hook | `src/hooks/use*.ts` | Consistent return signature `{items, loading, error, fetchItems}` |
| StandardDialog | `src/components/StandardDialog.tsx` | Eliminates 60-80 lines of boilerplate per modal |
| Quick create dialog | `QuickEntityCreateDialog` | Create related entity mid-workflow without losing context |
| Two-level idempotency | `stripe_webhook_events` + `stripe_invoice_id` | Stripe retries must not create duplicate records |

---

## Anti-patterns to avoid

**Backend**

- `if record.save` / `if record.update` style for happy-path controllers. Use `save!` / `update!` and let ApplicationController rescue handlers return error responses.
- Filtering without Ransack whitelist. All Ransack queries require explicit `ransackable_attributes` and `ransackable_associations` on the model.
- N+1 queries in list endpoints. Use `.includes`, `.joins`, or SQL aggregates. Bullet gem will catch missed cases.
- Loading all records into Ruby for aggregation. Use SQL `SUM`, `COUNT`, `GROUP BY`.
- Instance methods on controllers. Extract to service objects when logic exceeds 3 steps or needs private helpers.
- Class methods on services. All services use instance methods (initialize with params, call public method).

**Frontend**

- Duplicated type definitions. All shared types live in `src/types/`. Import from barrel export `'../types'`.
- Filter state inside List components. Lists are pure presentation. Pages manage filter state and pass filtered data down.
- Inline object or array in props or deps arrays. Objects are re-created each render, causing infinite loops. Destructure primitives or wrap in `useMemo`.
- Disabling `exhaustive-deps`. Fix the root cause (usually a missing `useCallback` wrapper on a fetch function).
- Cancel button in create mode dialogs. Create forms have no cancel. Edit mode inline forms have cancel. Dialogs have only the X button.

---

## Code smells to watch for

**General**
- Long method or large class (single unit doing too much)
- God object (one module knows too much)
- Shotgun surgery (one logical change requires many small edits across unrelated files)
- Feature envy (function uses another module's data more than its own)
- Data clumps (groups of values that always travel together but have no type)
- Primitive obsession (raw strings or ints where a named type would clarify intent)
- Duplicated code (same logic in two places)
- Dead code (unreachable or unused code)
- Magic values (unexplained literal strings or numbers inline in logic)

**Project-specific**
- Raw `params[:x]` access in controllers without `require` / `permit`. Use strong params.
- `render json: record` without a presenter. Always use a presenter for public API responses.
- Controller action beyond 10 lines. Logic belongs in a service.
- Ransack query without whitelist. See Ransack whitelist pattern above.
- Component state for data that belongs in a custom hook. Extract to `src/hooks/` when the same fetch logic appears in two components.
- `amount` stored as dollars in the database. All amounts are stored as integer cents. `formatCurrency` and `parseCurrency` in `src/utils/currency.ts` handle conversion.

---

## Refactoring log

| Date | What changed | Why | Commit |
|---|---|---|---|
| 2026-06-24 | Epic structure changed from category-based (7 epics) to thin vertical slices (5 epics) | Code quality and tests baked into every epic, not deferred | n/a (docs only) |
