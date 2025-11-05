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
