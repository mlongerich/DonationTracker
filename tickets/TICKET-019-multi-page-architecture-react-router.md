## [TICKET-019] Multi-Page Architecture with React Router

**Status:** 📋 Planned
**Priority:** 🔴 High
**Started:** 2025-10-15
**Dependencies:** TICKET-006, TICKET-007 (Donation features exist)

### User Story
As a user, I want separate pages for home, donations, and donors so that I can focus on specific tasks without visual clutter and navigate between different sections of the application.

### Acceptance Criteria
- [ ] Install `react-router-dom` dependency
- [ ] Create `HomePage.tsx` component (dashboard with quick stats)
- [ ] Create `DonationsPage.tsx` component (form + list)
- [ ] Create `DonorsPage.tsx` component (form + list)
- [ ] Create `Navigation.tsx` component (navbar with links)
- [ ] Update `App.tsx` to use BrowserRouter and Routes
- [ ] Home page shows recent donations (last 5-10)
- [ ] Home page shows quick action buttons
- [ ] Navigation highlights active page
- [ ] All pages are responsive (mobile-first)
- [ ] Jest tests for routing and navigation
- [ ] Cypress E2E tests for page navigation

### Technical Notes
- **React Router v6**: Use `BrowserRouter`, `Routes`, `Route`, `Link`
- **Navigation**: Material-UI `AppBar` and `Tabs` or custom navbar
- **Layout**: Shared layout component for consistent header/nav
- **URL Structure**:
  - `/` - HomePage
  - `/donations` - DonationsPage
  - `/donors` - DonorsPage
- **State Management**: Each page manages its own data fetching
- **Separation**: Move donor logic from App.tsx to DonorsPage, donation logic to DonationsPage

### Page Structure
```
HomePage:
  - Quick stats card (total donors, total donations, recent amount)
  - Recent donations list (last 10)
  - Quick action buttons ("Record Donation", "Add Donor")

DonationsPage:
  - DonationForm at top
  - DonationList with filtering/pagination below

DonorsPage:
  - DonorForm at top
  - DonorList with search/pagination below
```

### Files Changed
- `donation_tracker_frontend/package.json` (add react-router-dom)
- `donation_tracker_frontend/src/App.tsx` (refactor to use routing)
- `donation_tracker_frontend/src/pages/HomePage.tsx` (new)
- `donation_tracker_frontend/src/pages/DonationsPage.tsx` (new)
- `donation_tracker_frontend/src/pages/DonorsPage.tsx` (new)
- `donation_tracker_frontend/src/components/Navigation.tsx` (new)
- `donation_tracker_frontend/src/App.test.tsx` (update for routing)
- `donation_tracker_frontend/cypress/e2e/navigation.cy.ts` (new)

### Related Commits
- (To be added during implementation)
