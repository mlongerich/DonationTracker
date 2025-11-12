## [TICKET-096] Refactor DonationList Component Pattern

**Status:** 🔵 In Progress
**Priority:** 🟡 Medium
**Effort:** M (Medium - 1-2 hours)
**Created:** 2025-11-11
**Updated:** 2025-11-12 (clarified TICKET-095 dependency)
**Dependencies:** TICKET-095 (removes console.log first) - Optional but recommended

### User Story
As a developer, I want DonationList to follow the same component pattern as other List components so that filtering logic is consistently handled at the Page level.

### Problem Statement
DonationList is the only List component with built-in filtering logic (date range, donor selection, payment method). All other List components (ChildList, DonorList, ProjectList, SponsorshipList) are pure presentation components with filtering handled at the Page level.

**Code Smell:** Inconsistent component patterns
**Issue:** DonationList has mixed concerns (presentation + state management + filtering)
**Impact:** Harder to maintain, test, and reuse

### Current Pattern Analysis

#### DonationList (Outlier - Has Built-in Filtering)
```typescript
// src/components/DonationList.tsx
const DonationList: React.FC<DonationListProps> = ({
  donations,
  paginationMeta,
  onPageChange,
  onDateRangeChange,      // ⚠️ Filter callback
  onDonorChange,          // ⚠️ Filter callback
  onPaymentMethodChange,  // ⚠️ Filter callback
}) => {
  console.log(/* ... */);  // ⚠️ Debug log (TICKET-095 removes this)
  const [startDate, setStartDate] = useState<Dayjs | null>(null);  // ⚠️ Local state
  const [endDate, setEndDate] = useState<Dayjs | null>(null);      // ⚠️ Local state
  const [dateError, setDateError] = useState<string | null>(null); // ⚠️ Local state
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null); // ⚠️ Local state

  // ... 100+ lines of filtering logic

  return (
    <div>
      <Stack spacing={2} sx={{ mb: 2 }}>
        {/* Filter UI - should be in Page */}
        <DonorAutocomplete value={selectedDonor} onChange={handleDonorChange} />
        <FormControl fullWidth size="small">
          <Select /* payment method filter */></Select>
        </FormControl>
        <DatePicker /* date range filters *//>
      </Stack>

      {/* List rendering */}
      <Stack spacing={2}>
        {donations.map((donation) => (/* ... */))}
      </Stack>
    </div>
  );
};
```

**Note:** TICKET-095 removes the console.log statement (line 45) before this refactor. While not strictly required, it's recommended to do TICKET-095 first for a cleaner refactoring experience.

#### ChildList (Correct Pattern - Pure Presentation)
```typescript
// src/components/ChildList.tsx
const ChildList: React.FC<ChildListProps> = ({
  children,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onAddSponsor,
  sponsorships,
}) => {
  // NO local state for filtering
  // NO filter UI components
  // ONLY presentation logic

  return (
    <Stack spacing={2}>
      {children.map((child) => (/* ... */))}
    </Stack>
  );
};
```

### Acceptance Criteria
- [ ] Extract filtering logic from DonationList to DonationsPage
- [ ] DonationList becomes a pure presentation component (like ChildList)
- [ ] Create reusable `DonationFilters` component for filter UI
- [ ] DonationsPage manages all filter state
- [ ] DonationList interface matches other List component patterns
- [ ] Pagination rendered at Page level (not in List component)
- [ ] All existing tests pass
- [ ] Add tests for new DonationFilters component

### Technical Approach

#### Phase 1: Create DonationFilters Component

```typescript
// src/components/DonationFilters.tsx (NEW)
import React, { useState } from 'react';
import { Stack, Alert, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DatePicker, DateValidationError, PickerChangeHandlerContext } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import DonorAutocomplete, { Donor } from './DonorAutocomplete';

interface DonationFiltersProps {
  onDateRangeChange?: (startDate: string | null, endDate: string | null) => void;
  onDonorChange?: (donorId: number | null) => void;
  onPaymentMethodChange?: (paymentMethod: string | null) => void;
}

const DonationFilters: React.FC<DonationFiltersProps> = ({
  onDateRangeChange,
  onDonorChange,
  onPaymentMethodChange,
}) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');

  // ... all filtering logic from DonationList moved here ...

  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      {dateError && <Alert severity="error">{dateError}</Alert>}

      <DonorAutocomplete
        value={selectedDonor}
        onChange={handleDonorChange}
        size="small"
      />

      <FormControl fullWidth size="small">
        <InputLabel>Filter by Payment Method</InputLabel>
        <Select value={paymentMethodFilter} onChange={handlePaymentMethodChange}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="stripe">Stripe</MenuItem>
          <MenuItem value="check">Check</MenuItem>
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
        </Select>
      </FormControl>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DatePicker label="Start Date" value={startDate} onChange={handleStartDateChange} />
        <DatePicker label="End Date" value={endDate} onChange={handleEndDateChange} />
        <Button variant="outlined" onClick={handleClearFilters}>Clear Filters</Button>
      </Stack>
    </Stack>
  );
};

export default DonationFilters;
```

#### Phase 2: Refactor DonationList to Pure Presentation

```typescript
// src/components/DonationList.tsx (REFACTORED)
import React from 'react';
import { Box, Typography, Card, CardContent, Stack, Chip } from '@mui/material';
import { Donation } from '../types';
import { formatCurrency } from '../utils/currency';

interface DonationListProps {
  donations: Donation[];
}

const DonationList: React.FC<DonationListProps> = ({ donations }) => {
  const getPaymentMethodLabel = (method?: string | null) => {
    if (!method) return null;
    return method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
  };

  if (donations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">No donations yet</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {donations.map((donation) => (
        <Card key={donation.id} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1">
                {formatCurrency(Number(donation.amount))}
              </Typography>
              {donation.payment_method && (
                <Chip
                  label={getPaymentMethodLabel(donation.payment_method)}
                  size="small"
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {donation.date} - {donation.donor_name || `Donor #${donation.donor_id}`}
              {` - ${donation.project_title || 'General Donation'}`}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default DonationList;
```

#### Phase 3: Update DonationsPage

```typescript
// src/pages/DonationsPage.tsx (UPDATED)
import { useEffect, useState } from 'react';
import { Typography, Box, Pagination } from '@mui/material';
import apiClient from '../api/client';
import DonationForm from '../components/DonationForm';
import DonationList from '../components/DonationList';
import DonationFilters from '../components/DonationFilters';  // NEW
import { Donation } from '../types';
import { usePagination } from '../hooks';

const DonationsPage = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({ startDate: null, endDate: null });
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const { currentPage, paginationMeta, setPaginationMeta, handlePageChange } = usePagination();

  const fetchDonations = async () => {
    // ... existing fetch logic ...
  };

  useEffect(() => {
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, dateRange, selectedDonorId, selectedPaymentMethod]);

  const handleDateRangeChange = (startDate: string | null, endDate: string | null) => {
    setDateRange({ startDate, endDate });
  };

  const handleDonorFilterChange = (donorId: number | null) => {
    setSelectedDonorId(donorId);
  };

  const handlePaymentMethodFilterChange = (paymentMethod: string | null) => {
    setSelectedPaymentMethod(paymentMethod);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Donation Management
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Record Donation
        </Typography>
        <DonationForm onSuccess={fetchDonations} />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Recent Donations
        </Typography>

        {/* NEW: Filters at Page level */}
        <DonationFilters
          onDateRangeChange={handleDateRangeChange}
          onDonorChange={handleDonorFilterChange}
          onPaymentMethodChange={handlePaymentMethodFilterChange}
        />

        {/* UPDATED: Simple List component */}
        <DonationList donations={donations} />

        {/* Pagination at Page level */}
        {paginationMeta && paginationMeta.total_pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={paginationMeta.total_pages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DonationsPage;
```

### Benefits
- **Consistency**: All List components follow same pattern
- **Reusability**: DonationList can be used without filters (e.g., in DonorDetailsPage)
- **Testability**: Easier to test presentation separate from filtering logic
- **Maintainability**: Clear separation of concerns
- **Composability**: DonationFilters can be reused in other contexts

### Testing Strategy

```typescript
// src/components/DonationFilters.test.tsx (NEW)
import { render, screen, fireEvent } from '@testing-library/react';
import DonationFilters from './DonationFilters';

describe('DonationFilters', () => {
  it('renders all filter controls', () => {
    render(<DonationFilters />);

    expect(screen.getByLabelText(/filter by payment method/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByText(/clear filters/i)).toBeInTheDocument();
  });

  it('calls onDonorChange when donor selected', () => {
    const handleDonorChange = jest.fn();
    render(<DonationFilters onDonorChange={handleDonorChange} />);

    // ... test donor selection ...

    expect(handleDonorChange).toHaveBeenCalledWith(123);
  });

  // ... more filter tests ...
});

// src/components/DonationList.test.tsx (UPDATED)
describe('DonationList', () => {
  it('renders list of donations', () => {
    const donations = [
      { id: 1, amount: 10000, date: '2025-01-01', donor_name: 'John Doe' },
      { id: 2, amount: 5000, date: '2025-01-02', donor_name: 'Jane Smith' },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('shows empty state when no donations', () => {
    render(<DonationList donations={[]} />);

    expect(screen.getByText(/no donations yet/i)).toBeInTheDocument();
  });
});
```

### Files to Create
- `src/components/DonationFilters.tsx` (NEW)
- `src/components/DonationFilters.test.tsx` (NEW)

### Files to Modify
- `src/components/DonationList.tsx` (REFACTOR - remove filtering logic)
- `src/components/DonationList.test.tsx` (UPDATE - remove filter tests)
- `src/pages/DonationsPage.tsx` (UPDATE - use DonationFilters component)
- `src/pages/DonationsPage.test.tsx` (UPDATE - test filter integration)

### Migration Checklist
1. [ ] Create DonationFilters component with existing filter logic
2. [ ] Write tests for DonationFilters
3. [ ] Refactor DonationList to pure presentation
4. [ ] Update DonationList tests
5. [ ] Update DonationsPage to use both components
6. [ ] Update DonationsPage tests
7. [ ] Run full test suite
8. [ ] Manual QA - verify all filtering still works

### Related Tickets
- TICKET-095: Remove Debug Logging (removes console.log from DonationList first) - Recommended to do before this ticket
- Part of CODE_SMELL_ANALYSIS initiative
- Follows pattern used in ChildrenPage, DonorsPage, ProjectsPage
- Identified in code smell review on 2025-11-11

### Notes
- This is a refactor ticket - no functionality changes
- Improves consistency with other List components
- Makes DonationList reusable in other contexts (future donor details page)
- Consider applying same pattern if other List components gain filtering in future
- **TICKET-095 recommended first**: While not strictly required, removing the console.log statement in TICKET-095 first provides a cleaner starting point for this refactor
