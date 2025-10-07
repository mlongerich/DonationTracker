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
