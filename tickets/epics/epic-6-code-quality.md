---
updated: 2026-06-23
archived: 2026-06-24
---

> **Archived 2026-06-24.** Code quality is baked into every epic and ticket as a definition-of-done requirement, not a separate pass. This epic is dissolved.



# Epic 6 – Code Quality and Architecture

**Goal:** Establish consistent patterns, reduce technical debt, improve code organisation, and maintain quality metrics.

**Status:** Most foundational patterns are complete. A few lower-priority refactors remain planned.

---

## Completed tickets

| Ticket | Description |
|---|---|
| TICKET-036 | Implement React error boundary |
| TICKET-037 | Standardise service object patterns (instance methods) |
| TICKET-042 | Add class-level documentation comments (YARD style) |
| TICKET-066 | Extract useChildren custom hook |
| TICKET-067 | Standardise API response wrapping with presenters |
| TICKET-068 | Global error handling in ApplicationController |
| TICKET-069 | Code quality cleanup batch (linter warnings) |
| TICKET-073 | Refactor methods with TooManyStatements |
| TICKET-094 | Fix SponsorshipsController error handling pattern |
| TICKET-096 | Refactor DonationList component pattern (pure presentation) |
| TICKET-099 | Expand custom hooks library |
| TICKET-126 | Intelligent pre-commit documentation validation |
| TICKET-127 | StandardDialog component and form UX consistency |
| TICKET-132 | Add Ransack security comments and fix whitelists |

---

## Planned tickets

| Ticket | Description | Priority |
|---|---|---|
| TICKET-033 | Implement policy objects for authorisation | Medium |
| TICKET-034 | Create query objects for complex database queries | Medium |
| TICKET-039 | Add donation status enum validation | Low |
| TICKET-040 | Implement Context API for donor and donation state | Low |
| TICKET-043 | Refine controller concerns implementation | Low |
| TICKET-045 | Refactor DonorImportService complexity | Low |
| TICKET-098 | Evaluate form objects pattern (research ticket) | Low |
| TICKET-129 | Internationalisation i18n test resilience | Low |
| TICKET-131 | Extend custom hooks with CRUD methods (move API calls from pages to hooks) | Medium |
| TICKET-135 | Fix skip-docs commit tag | Low |
