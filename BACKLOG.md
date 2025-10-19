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

### [Page Separation & Navigation Refactoring]
**Added:** 2025-10-18
**Priority:** 🟡 Medium
**Effort:** M

**Description:**
Refactor the monolithic App.tsx component into separate page components (DonorsPage, DonationsPage, HomePage) with proper routing structure. Currently all application logic lives in App.tsx (300+ lines), making it difficult to maintain and navigate.

**User Value:**
- Improved code organization and maintainability
- Faster navigation between sections with route-based URLs
- Better separation of concerns (donations vs donors vs projects)
- Enables browser back/forward navigation between sections
- Shareable URLs for specific pages

**Technical Approach:**
- Create `src/pages/HomePage.tsx` - Main dashboard/donation entry
- Create `src/pages/DonorsPage.tsx` - Donor CRUD operations
- Create `src/pages/DonationsPage.tsx` - Donation list and filtering
- Move routing from inside App to index.tsx or dedicated Router component
- Extract shared state management (consider Context API or state management library)
- Add navigation header/sidebar component for page switching
- Update all components to work with page-level routing

**Dependencies:**
- Basic routing structure ✅ (TICKET-009 added /projects route)

---

### [Donor Bulk Operations]
**Added:** 2025-10-07
**Priority:** 🟡 Medium
**Effort:** M

**Description:**
Allow bulk actions on donors (bulk archive, bulk restore, bulk export)

**User Value:**
Saves time when managing many donors at once

**Technical Approach:**
- Add checkbox selection to DonorList
- Add bulk action toolbar
- Backend endpoint for bulk operations

**Dependencies:**
- Archive/Restore feature ✅ (complete)

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
**Added:** 2025-10-07
**Priority:** 🟢 Low
**Effort:** S

**Description:**
Export donor list to Excel or CSV format

**User Value:**
Allow data analysis in spreadsheet tools, backups

**Technical Approach:**
- Add export button to donor list
- Backend generates CSV/XLSX
- Include filters (active/archived, search results)

**Dependencies:**
- Donor list with search/filter ✅ (complete)

---

### [Archived Donor Donation Visibility Policy]
**Added:** 2025-10-18
**Priority:** 🟡 Medium
**Effort:** S

**Description:**
Decide and implement how donations from archived donors should be displayed in the donation list and reports. Currently, donations remain visible even after their donor is archived, but this behavior needs to be explicitly defined as a business rule.

**User Value:**
Clear, predictable behavior when working with archived donors and historical donations

**Options to Consider:**
1. **Keep visible with indicator** - Show all donations with "Archived Donor" badge/indicator
2. **Hide by default, filterable** - Hide archived donor donations by default, add filter to show them
3. **Always visible** - Current behavior, donations always show regardless of donor status
4. **Cascade archive** - When donor is archived, associated donations are soft-deleted too (with restore)
5. **Read-only mode** - Show but prevent editing donations from archived donors

**Technical Approach:**
- Update DonationList filtering logic based on chosen policy
- Add visual indicators if needed (badges, grayed out rows)
- Update DonationPresenter to include donor archive status
- Consider implications for reports and analytics
- Document decision in CLAUDE.md business rules section

**Dependencies:**
- Donor soft delete/archive feature ✅ (TICKET-001 complete)
- Donation list with filtering ✅ (TICKET-016 complete)

**Related Considerations:**
- What happens when archived donor is restored? (Donations should become visible again)
- Should donation totals include archived donor donations?
- Should search include archived donor donations?

---
