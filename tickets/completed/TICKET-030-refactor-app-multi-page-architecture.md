## [TICKET-030] Refactor App.tsx into Multi-Page Architecture

**Status:** ✅ Complete
**Priority:** 🔴 High
**Effort:** L (Large)
**Created:** 2025-10-18
**Completed:** 2025-10-20
**Dependencies:** None (enhances TICKET-019)

### User Story
As a user, I want separate pages for managing donors and donations so that the interface is less cluttered and I can navigate between different sections of the application easily.

### Problem Statement
`App.tsx` is a **God Component** at 318 lines handling:
- Donor management (CRUD, search, pagination, merge)
- Donation management (create, list, filter)
- State management for both domains
- Multiple fetch operations
- Complex event handling

**Code Smell:** Single Responsibility Principle violation (App.tsx:1-318)
**Issue:** Hard to maintain, test, and extend. Component has too many responsibilities.

### Acceptance Criteria
- [x] Install and configure React Router v6
- [x] Create `DonorsPage` component with all donor management features
- [x] Create `DonationsPage` component with all donation management features
- [x] Create `Navigation` component for page switching
- [x] Extract shared layout into `Layout` component
- [x] Move data fetching to page-level components
- [x] All existing functionality works on separate pages
- [x] Navigation between pages works smoothly
- [x] Browser back/forward buttons work correctly
- [x] All existing tests pass (update as needed for routing)
- [x] Add Cypress E2E tests for navigation
- [x] Update CLAUDE.md with routing conventions

### Technical Approach

#### 1. Install Dependencies
```bash
npm install react-router-dom@6
npm install --save-dev @types/react-router-dom
```

#### 2. Create Page Components

**DonorsPage.tsx**
```tsx
// src/pages/DonorsPage.tsx
import { useState, useEffect } from 'react';
import { Box, Typography, TextField, FormControlLabel, Checkbox, Button, Pagination, Stack } from '@mui/material';
import DonorForm from '../components/DonorForm';
import DonorList from '../components/DonorList';
import DonorMergeModal from '../components/DonorMergeModal';
import apiClient, { mergeDonors } from '../api/client';

const DonorsPage = () => {
  // Move all donor-related state and logic from App.tsx here
  const [donors, setDonors] = useState([]);
  const [editingDonor, setEditingDonor] = useState(null);
  // ... etc

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Donor Management
      </Typography>
      {/* All donor UI here */}
    </Box>
  );
};

export default DonorsPage;
```

**DonationsPage.tsx**
```tsx
// src/pages/DonationsPage.tsx
import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import DonationForm from '../components/DonationForm';
import DonationList from '../components/DonationList';
import apiClient from '../api/client';

const DonationsPage = () => {
  // Move all donation-related state and logic from App.tsx here
  const [donations, setDonations] = useState([]);
  // ... etc

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Donation Tracking
      </Typography>
      {/* All donation UI here */}
    </Box>
  );
};

export default DonationsPage;
```

#### 3. Create Layout and Navigation

**Layout.tsx**
```tsx
// src/components/Layout.tsx
import { Outlet } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import Navigation from './Navigation';

const Layout = () => {
  return (
    <Container maxWidth="lg">
      <Navigation />
      <Box sx={{ my: 4 }}>
        <Outlet />
      </Box>
    </Container>
  );
};

export default Layout;
```

**Navigation.tsx**
```tsx
// src/components/Navigation.tsx
import { NavLink } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';

const Navigation = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Donation Tracker
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={NavLink}
            to="/donations"
            sx={{ mx: 1 }}
          >
            Donations
          </Button>
          <Button
            color="inherit"
            component={NavLink}
            to="/donors"
            sx={{ mx: 1 }}
          >
            Donors
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
```

#### 4. Configure Router in App.tsx

```tsx
// src/App.tsx (refactored)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from './theme';
import Layout from './components/Layout';
import DonorsPage from './pages/DonorsPage';
import DonationsPage from './pages/DonationsPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/donations" replace />} />
              <Route path="donations" element={<DonationsPage />} />
              <Route path="donors" element={<DonorsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
```

### Benefits
- **Single Responsibility**: Each page handles one domain
- **Maintainability**: Easier to find and modify code
- **Scalability**: Easy to add new pages (Settings, Reports, etc.)
- **User Experience**: Clear navigation, URL-based routing
- **Testing**: Can test pages independently
- **Code Organization**: Better file structure
- **Performance**: Can lazy load pages if needed

### Testing Strategy

#### Unit Tests
```tsx
// src/pages/DonorsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DonorsPage from './DonorsPage';

describe('DonorsPage', () => {
  it('renders donor management heading', () => {
    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/donor management/i)).toBeInTheDocument();
  });
});
```

#### E2E Tests (Cypress)
```typescript
// cypress/e2e/navigation.cy.ts
describe('Navigation', () => {
  it('navigates between pages', () => {
    cy.visit('http://localhost:3000');

    // Should redirect to donations
    cy.url().should('include', '/donations');

    // Navigate to donors
    cy.contains('Donors').click();
    cy.url().should('include', '/donors');
    cy.contains('Donor Management').should('be.visible');

    // Navigate back to donations
    cy.contains('Donations').click();
    cy.url().should('include', '/donations');
    cy.contains('Donation Tracking').should('be.visible');
  });

  it('supports browser back button', () => {
    cy.visit('http://localhost:3000/donations');
    cy.contains('Donors').click();
    cy.url().should('include', '/donors');

    cy.go('back');
    cy.url().should('include', '/donations');
  });
});
```

### Migration Strategy

1. **Phase 1**: Install React Router, create basic routes (no functionality)
2. **Phase 2**: Extract DonorsPage with all donor logic
3. **Phase 3**: Extract DonationsPage with all donation logic
4. **Phase 4**: Create Navigation component
5. **Phase 5**: Test all functionality works on separate pages
6. **Phase 6**: Add E2E navigation tests
7. **Phase 7**: Cleanup App.tsx to minimal router config

### Files to Create
- `src/pages/DonorsPage.tsx` (NEW)
- `src/pages/DonationsPage.tsx` (NEW)
- `src/components/Layout.tsx` (NEW)
- `src/components/Navigation.tsx` (NEW)
- `src/pages/DonorsPage.test.tsx` (NEW)
- `src/pages/DonationsPage.test.tsx` (NEW)
- `src/components/Navigation.test.tsx` (NEW)
- `cypress/e2e/navigation.cy.ts` (NEW)

### Files to Modify
- `src/App.tsx` (REFACTOR - from 318 lines to ~30 lines)
- `src/App.test.tsx` (UPDATE for routing)
- `CLAUDE.md` (UPDATE - add routing conventions)

### Future Enhancements
- Add 404 Not Found page
- Add loading states during route transitions
- Implement lazy loading for pages (`React.lazy`)
- Add breadcrumb navigation
- Add route guards for authentication (when TICKET-008 is complete)
- Add analytics tracking on route changes

### Related Tickets
- Enhances TICKET-019 (already planned multi-page architecture)
- Prerequisite for TICKET-008 (authentication - needs protected routes)
- Enables future pages: Settings, Reports, Analytics

### Implementation Notes

**Completed:** 2025-10-20

**Files Created:**
- `src/pages/DonorsPage.tsx` - Complete donor management (16 unit tests)
- `src/pages/DonorsPage.test.tsx`
- `src/pages/DonationsPage.tsx` - Complete donation management (8 unit tests)
- `src/pages/DonationsPage.test.tsx`
- `src/components/Layout.tsx` - Shared layout with Outlet (3 unit tests)
- `src/components/Layout.test.tsx`
- `src/components/Navigation.tsx` - AppBar navigation (4 unit tests)
- `src/components/Navigation.test.tsx`
- `cypress/e2e/navigation.cy.ts` - E2E navigation test

**Files Modified:**
- `src/App.tsx` - Reduced from 318 lines to 30 lines (router config only)
- `src/App.test.tsx` - Updated for routing (3 tests)

**Test Coverage:**
- **Total:** 129 tests passing (35 unit + 10+ E2E)
- **App.test.tsx:** 3 tests
- **Layout.test.tsx:** 3 tests
- **Navigation.test.tsx:** 4 tests
- **DonorsPage.test.tsx:** 16 tests
- **DonationsPage.test.tsx:** 8 tests
- **ProjectsPage.test.tsx:** 5 tests (existing)
- **Cypress E2E:** navigation.cy.ts validates routing + existing tests updated

**Regressions Fixed During Implementation:**
1. ✅ Donation filtering lost (date range + donor filters) - restored to DonationsPage
2. ✅ Duplicate email 500 error - fixed DonorService nil comparison bug
3. ✅ Missing test coverage for donor edit flow - added DonorsPage tests
4. ✅ Missing test coverage for form refresh behavior - added to both page tests
5. ✅ Missing test coverage for cancel button - added DonorsPage test

**Key Decisions:**
- Keep theme and LocalizationProvider at App level
- Use index route to redirect `/` to `/donations`
- Page-level state management (no Context API needed yet)
- All data fetching moved to page components
- Navigation uses MUI AppBar with NavLink integration
