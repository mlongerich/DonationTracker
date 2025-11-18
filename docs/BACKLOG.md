# Feature Backlog

Future feature ideas and improvements. Items here are NOT currently being worked on.

**How to use:**
- When you think of a new feature during development, add it here
- Run `/compact` after adding to clear the context
- Review this file periodically to prioritize next work

---

## Template

```markdown
### [Feature Name]
**Added:** YYYY-MM-DD
**Priority:** 🔴 High | 🟡 Medium | 🟢 Low
**Effort:** S | M | L | XL

**Description:**
What is this feature and why do we need it?

**User Value:**
How does this benefit users?

**Technical Approach:**
High-level implementation ideas

**Dependencies:**
What needs to be done first?
```

---

## Prioritized Backlog

### [Donor Bulk Operations]
**Status:** ✅ **Converted to TICKET-087**
**Added:** 2025-10-07
**Converted:** 2025-11-05

---

### [Donation Entry - Slice 2]
**Added:** 2025-10-07
**Priority:** 🔴 High
**Effort:** L

**Description:**
Record donations for existing donors (next vertical slice per DonationTracking.md)

**User Value:**
Core functionality - track donation amounts and link to donors

**Technical Approach:**
- Donation model with amount validation, belongs_to donor
- POST /api/donations endpoint
- DonationForm component with donor selection dropdown
- Full TDD workflow

**Dependencies:**
- Donor management (CRUD) ✅ (complete)

---

### [Donor Import from CSV]
**Added:** 2025-10-07
**Priority:** 🟢 Low
**Effort:** M

**Description:**
Import historical donor data from Google Sheets/CSV

**User Value:**
Migrate existing data without manual entry

**Technical Approach:**
- CSV parsing with validation
- Duplicate detection using DonorService
- Rake task for import
- Import summary report

**Dependencies:**
- DonorService smart merging ✅ (complete)

---

### [Donor Export to Excel/CSV]
**Status:** ✅ **Converted to TICKET-088**
**Added:** 2025-10-07
**Converted:** 2025-11-05

---

### [Fix Cypress in Docker (Alpine ARM64 Binary Issue)]
**Status:** ✅ **Converted to TICKET-090**
**Added:** 2025-11-05
**Converted:** 2025-11-05

---

### [Archived Donor Donation Visibility Policy]
**Status:** ✅ **Converted to TICKET-089**
**Added:** 2025-10-18
**Converted:** 2025-11-05

---

### [E2E Pagination Testing Strategy]
**Added:** 2025-11-12
**Priority:** 🟢 Low
**Effort:** M

**Description:**
Explore comprehensive E2E testing for pagination functionality across all paginated pages (donors, donations, children, sponsorships, projects).

**Current State:**
- Pagination logic fully tested in Jest (unit tests)
- No pages currently test pagination in E2E tests
- E2E tests focus on page load and filtering only

**User Value:**
- Confidence that pagination works end-to-end with real API
- Catch integration bugs between frontend and backend pagination

**Technical Approach:**
**Option 1: Backend seed endpoint**
```ruby
# app/controllers/api/test_controller.rb
def seed_sponsorships
  count = params[:count].to_i
  # Efficient bulk creation
end
```

**Option 2: Cypress custom commands**
```javascript
Cypress.Commands.add('createSponsorships', (count) => {
  cy.request('POST', '/api/test/seed_sponsorships', { count });
});
```

**Option 3: Test smaller datasets**
- Create 26 records (just over 25/page threshold)
- Verify pagination UI appears
- Don't test clicking through pages

**Considerations:**
- Trade-off: Speed vs coverage
- Consistency: Apply to all pages or none
- Maintenance: More E2E tests = more potential flakiness

**Dependencies:**
- None (can be explored independently)

**Decision:** Deferred for now. Jest tests provide sufficient coverage for pagination logic. Revisit if pagination bugs are found in production.

---

### [Frontend Repository Pattern for API Calls]
**Status:** 💡 **Identified in CODE_SMELL_ANALYSIS - Consider for future**
**Added:** 2025-11-18
**Priority:** 🟢 Low
**Effort:** M

**Description:**
Centralize API endpoint definitions using Repository pattern instead of scattered `apiClient.get/post/put` calls throughout page components.

**Current State:**
```tsx
// Scattered across pages (DonorsPage, ChildrenPage, etc.)
const response = await apiClient.get('/api/donors', { params });
await apiClient.post('/api/children', { child: data });
```

**Proposed Pattern:**
```tsx
// src/repositories/DonorRepository.ts
export const DonorRepository = {
  list: (params) => apiClient.get('/api/donors', { params }),
  create: (data) => apiClient.post('/api/donors', { donor: data }),
  update: (id, data) => apiClient.patch(`/api/donors/${id}`, { donor: data }),
  archive: (id) => apiClient.delete(`/api/donors/${id}`),
  restore: (id) => apiClient.post(`/api/donors/${id}/restore`),
};

// Usage in pages
const response = await DonorRepository.list({ page, per_page });
```

**User Value:**
- Centralized API endpoint definitions (easier to maintain)
- Type safety for API calls
- Easier to mock for testing
- DRY principle (no duplicate endpoint strings)

**Technical Approach:**
- Create `src/repositories/` directory
- Extract repository for each entity (Donor, Child, Donation, Project, Sponsorship)
- Update pages to use repositories instead of direct apiClient calls
- Update tests to mock repositories

**Considerations:**
- Current `api/client.ts` already has some helpers (createDonation, mergeDonors)
- Small codebase - current pattern is manageable
- Could formalize pattern incrementally (one repository at a time)
- Not documented in CLAUDE.md yet

**Dependencies:**
- None (can be implemented independently)

**Decision:** Defer to backlog. Current pattern works well for small codebase. Revisit if:
- API calls become harder to maintain (>5 endpoints per entity)
- Type safety issues emerge
- Team grows (need clearer API contract)

---

### [Error Handling Policy Documentation]
**Status:** 💡 **Identified in CODE_SMELL_ANALYSIS - Document existing practice**
**Added:** 2025-11-18
**Priority:** 🟢 Low
**Effort:** XS

**Description:**
Document the established error handling policy for frontend components in CLAUDE.md.

**Current State (Implicit, not documented):**
```tsx
// Read operations - Silent error handling
catch (error) {
  // Error silently handled - user will see empty list
}

// Write operations - Show error messages
catch (err: any) {
  setError(err.response.data.errors?.join(', ') || 'Failed to archive donor');
}
```

**User Value:**
- Consistent error handling across components
- Clear guidance for future development
- Better user experience (know when to show errors vs silent handling)

**Technical Approach:**
- Add "Frontend Error Handling Policy" section to CLAUDE.md
- Document existing patterns:
  - **Read operations (GET):** Silent error handling, show empty state
  - **Write operations (POST/PUT/PATCH):** Show Alert/Snackbar with error message
  - **Critical operations (DELETE, MERGE):** Show detailed error messages with status codes
- Reference existing implementations (DonorsPage, ChildrenPage, DonationsPage)

**Dependencies:**
- None (documentation only)

**Decision:** Low priority. Current practice is consistent and working well. Document when doing other CLAUDE.md updates.

---
