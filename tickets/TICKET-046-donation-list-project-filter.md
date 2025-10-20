## [TICKET-046] Add Project Filter to Donations Page

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium)
**Created:** 2025-10-20
**Dependencies:** None

### User Story
As a user, I want to filter donations by project on the donations page so that I can view donations for specific projects.

### Acceptance Criteria
- [ ] DonationList component has project autocomplete filter
- [ ] Selecting a project filters donations to only that project
- [ ] "Clear Filters" button clears project filter along with other filters
- [ ] Project filter persists across pagination
- [ ] Ransack query uses `q[project_id_eq]=<id>` parameter
- [ ] Cypress E2E test validates project filtering

### Technical Approach
Follow the same pattern as donor filter (TICKET-023):

1. Create `ProjectAutocomplete` component (similar to `DonorAutocomplete`)
2. Add `onProjectChange` prop to `DonationList` interface
3. Add `selectedProjectId` state in `DonationsPage`
4. Add project filter to Ransack query: `q.project_id_eq = selectedProjectId`
5. Wire up handler and pass to `DonationList`

### Estimated Time
~1.5 hours

### Related Tickets
- TICKET-023 (Donor filter pattern)
- TICKET-009 (Project-based donations)
