## [TICKET-111] Pending Review Admin UI

**Status:** 📋 Planned
**Priority:** 🟡 Medium - User Interface
**Dependencies:**
- TICKET-109 (Donation Status Infrastructure) - **REQUIRED** ✅
- TICKET-110 (Import Service with Status) - **REQUIRED** ✅
**Created:** 2025-11-14
**Branch:** `feature/stripe-import-redesign`

**⭐ CODE LIFECYCLE: PERMANENT - Production Admin Interface**

---

### User Story
As an admin, I want to view all donations that need attention (failed, refunded, canceled, duplicate subscriptions) in a dedicated admin section so that I can review and resolve issues.

---

### Context

**Part of:** docs/STRIPE_IMPORT_PLAN.md - Phase 3
**Replaces:** AdminPage with FailedPaymentsSection (deleted during cleanup)
**Why:** New design uses `donations.status` field instead of separate `failed_stripe_payments` table, so we need:
- Admin page with tabs (Pending Review, CSV Import, etc.)
- Filter donations by status (failed, refunded, canceled, needs_attention)
- Display duplicate subscription warnings
- Show needs_attention_reason for context
- Date range filtering and pagination

**See:** docs/STRIPE_IMPORT_PLAN.md sections:
- "Admin UI Changes"
- "Frontend Changes"

---

### Acceptance Criteria

**Admin Page Structure:**
- [ ] Create AdminPage with tab navigation
- [ ] Tab 1: "Pending Review" (shows non-succeeded donations)
- [ ] Tab 2: "CSV Import" (placeholder for future)
- [ ] Add /admin route in App.tsx
- [ ] Add "Admin" navigation link

**Pending Review Section:**
- [ ] Query donations with `status != 'succeeded'`
- [ ] Display donor name, email, amount, date, status
- [ ] Show status badge with color coding (failed=red, refunded=orange, canceled=gray, needs_attention=yellow)
- [ ] Display duplicate_subscription_detected warning icon
- [ ] Display needs_attention_reason when present
- [ ] Pagination (25 per page)
- [ ] Date range filters (from/to)
- [ ] Status dropdown filter (all, failed, refunded, canceled, needs_attention)
- [ ] Loading states

**Types:**
- [ ] Update Donation type to include new fields (status, duplicate_subscription_detected, needs_attention_reason, stripe_subscription_id)
- [ ] Remove FailedPayment type (no longer needed)

**API Integration:**
- [ ] Query /api/donations with Ransack filters
- [ ] Filter: `q[status_not_eq]=succeeded`
- [ ] Filter: `q[status_eq]=<selected_status>` (when dropdown selected)
- [ ] Filter: `q[date_gteq]=<from_date>` (when date range set)
- [ ] Filter: `q[date_lteq]=<to_date>` (when date range set)
- [ ] Pagination: `page=<n>&per_page=25`

**Testing:**
- [ ] Jest: AdminPage component tests
- [ ] Jest: PendingReviewSection component tests
- [ ] Jest: PendingReviewDonationList component tests
- [ ] Jest: Status badge color tests
- [ ] Jest: Filter tests (status, date range)
- [ ] Jest: Pagination tests
- [ ] All tests pass (80% frontend coverage)

**Documentation:**
- [ ] Update component documentation
- [ ] Update CLAUDE.md if new patterns used

---

### Technical Approach

#### 1. Update Donation Type

```typescript
// src/types/donation.ts
export interface Donation {
  id: number;
  amount: string;
  date: string;
  donor_id: number;
  donor_name?: string;
  project_id?: number | null;
  project_title?: string;
  payment_method?: 'stripe' | 'check' | 'cash' | 'bank_transfer' | null;

  // NEW: Status tracking fields
  status: 'succeeded' | 'failed' | 'refunded' | 'canceled' | 'needs_attention';
  stripe_subscription_id?: string | null;
  duplicate_subscription_detected?: boolean;
  needs_attention_reason?: string | null;
}
```

#### 2. AdminPage Component

```typescript
// src/pages/AdminPage.tsx
import React, { useState } from 'react';
import { Container, Typography, Tabs, Tab, Box } from '@mui/material';
import PendingReviewSection from '../components/PendingReviewSection';

const AdminPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin
      </Typography>

      <Tabs value={currentTab} onChange={handleTabChange}>
        <Tab label="Pending Review" />
        <Tab label="CSV Import" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {currentTab === 0 && <PendingReviewSection />}
        {currentTab === 1 && <Typography>CSV Import coming soon</Typography>}
      </Box>
    </Container>
  );
};

export default AdminPage;
```

#### 3. PendingReviewSection Component

```typescript
// src/components/PendingReviewSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Stack, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import apiClient from '../api/client';
import PendingReviewDonationList from './PendingReviewDonationList';
import type { Donation, PaginationMeta } from '../types';

type DonationStatus = 'all' | 'failed' | 'refunded' | 'canceled' | 'needs_attention';

const PendingReviewSection: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<DonationStatus>('all');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const fetchDonations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        per_page: 25,
        'q[status_not_eq]': 'succeeded', // Exclude succeeded donations
      };

      // Status filter
      if (statusFilter !== 'all') {
        params['q[status_eq]'] = statusFilter;
      }

      // Date range filters
      if (fromDate) {
        params['q[date_gteq]'] = fromDate.toISOString().split('T')[0];
      }
      if (toDate) {
        params['q[date_lteq]'] = toDate.toISOString().split('T')[0];
      }

      const response = await apiClient.get('/api/donations', { params });
      setDonations(response.data.donations);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch pending donations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as DonationStatus)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="refunded">Refunded</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
            <MenuItem value="needs_attention">Needs Attention</MenuItem>
          </Select>
        </FormControl>

        {/* Date Range Filters */}
        <DatePicker
          label="From Date"
          value={fromDate}
          onChange={setFromDate}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="To Date"
          value={toDate}
          onChange={setToDate}
          slotProps={{ textField: { size: 'small' } }}
        />
      </Stack>

      <PendingReviewDonationList
        donations={donations}
        isLoading={isLoading}
        paginationMeta={paginationMeta}
        onPageChange={handlePageChange}
      />
    </Box>
  );
};

export default PendingReviewSection;
```

#### 4. PendingReviewDonationList Component

```typescript
// src/components/PendingReviewDonationList.tsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Pagination,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { Donation, PaginationMeta } from '../types';
import { formatCurrency } from '../utils/currency';

interface Props {
  donations: Donation[];
  isLoading: boolean;
  paginationMeta: PaginationMeta | null;
  onPageChange: (event: React.ChangeEvent<unknown>, page: number) => void;
}

const PendingReviewDonationList: React.FC<Props> = ({
  donations,
  isLoading,
  paginationMeta,
  onPageChange,
}) => {
  const getStatusColor = (
    status: string
  ): 'error' | 'warning' | 'default' | 'info' => {
    switch (status) {
      case 'failed':
        return 'error';
      case 'refunded':
        return 'warning';
      case 'canceled':
        return 'default';
      case 'needs_attention':
        return 'info';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (donations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No donations need attention
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2}>
        {donations.map((donation) => (
          <Card key={donation.id} variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="start"
              >
                <Box>
                  <Typography variant="h6">
                    {donation.donor_name || 'Unknown Donor'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {donation.date}
                  </Typography>

                  {/* Duplicate Subscription Warning */}
                  {donation.duplicate_subscription_detected && (
                    <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1 }}>
                      Duplicate subscription detected
                    </Alert>
                  )}

                  {/* Needs Attention Reason */}
                  {donation.needs_attention_reason && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Reason: {donation.needs_attention_reason}
                    </Typography>
                  )}
                </Box>

                <Stack alignItems="flex-end" spacing={1}>
                  <Typography variant="h6" color="error">
                    {formatCurrency(Number(donation.amount))}
                  </Typography>
                  <Chip
                    label={donation.status.toUpperCase().replace('_', ' ')}
                    color={getStatusColor(donation.status)}
                    size="small"
                  />
                  {donation.stripe_subscription_id && (
                    <Typography variant="caption" color="text.secondary">
                      {donation.stripe_subscription_id}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {paginationMeta && paginationMeta.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={paginationMeta.total_pages}
            page={paginationMeta.current_page}
            onChange={onPageChange}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default PendingReviewDonationList;
```

#### 5. Update Navigation & Routing

```typescript
// src/App.tsx
import AdminPage from './pages/AdminPage';

<Route path="admin" element={<AdminPage />} />
```

```typescript
// src/components/Navigation.tsx
<Button color="inherit" component={Link} to="/admin">
  Admin
</Button>
```

---

### Testing Strategy

```typescript
// src/pages/AdminPage.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPage from './AdminPage';

describe('AdminPage', () => {
  it('renders admin title', () => {
    render(
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders pending review tab', () => {
    render(
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>
    );
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });

  it('renders CSV import tab', () => {
    render(
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>
    );
    expect(screen.getByText('CSV Import')).toBeInTheDocument();
  });
});

// src/components/PendingReviewDonationList.test.tsx
import { render, screen } from '@testing-library/react';
import PendingReviewDonationList from './PendingReviewDonationList';
import { Donation } from '../types';

const mockDonation: Donation = {
  id: 1,
  amount: '10000',
  date: '2025-01-15',
  donor_id: 1,
  donor_name: 'John Doe',
  status: 'failed',
  payment_method: 'stripe',
};

describe('PendingReviewDonationList', () => {
  it('shows loading state', () => {
    render(
      <PendingReviewDonationList
        donations={[]}
        isLoading={true}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(
      <PendingReviewDonationList
        donations={[]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText(/no donations need attention/i)).toBeInTheDocument();
  });

  it('displays donation with status badge', () => {
    render(
      <PendingReviewDonationList
        donations={[mockDonation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('shows duplicate subscription warning', () => {
    const donation: Donation = {
      ...mockDonation,
      duplicate_subscription_detected: true,
    };
    render(
      <PendingReviewDonationList
        donations={[donation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText(/duplicate subscription/i)).toBeInTheDocument();
  });

  it('shows needs attention reason', () => {
    const donation: Donation = {
      ...mockDonation,
      status: 'needs_attention',
      needs_attention_reason: 'Metadata child_id=999 not found',
    };
    render(
      <PendingReviewDonationList
        donations={[donation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText(/Metadata child_id=999 not found/i)).toBeInTheDocument();
  });

  it('applies correct status badge color', () => {
    const { rerender } = render(
      <PendingReviewDonationList
        donations={[{ ...mockDonation, status: 'failed' }]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText('FAILED')).toHaveClass('MuiChip-colorError');

    rerender(
      <PendingReviewDonationList
        donations={[{ ...mockDonation, status: 'refunded' }]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText('REFUNDED')).toHaveClass('MuiChip-colorWarning');

    rerender(
      <PendingReviewDonationList
        donations={[{ ...mockDonation, status: 'needs_attention' }]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText('NEEDS ATTENTION')).toHaveClass('MuiChip-colorInfo');
  });
});
```

---

### Files to Create
- `src/pages/AdminPage.tsx`
- `src/pages/AdminPage.test.tsx`
- `src/components/PendingReviewSection.tsx`
- `src/components/PendingReviewSection.test.tsx`
- `src/components/PendingReviewDonationList.tsx`
- `src/components/PendingReviewDonationList.test.tsx`

### Files to Modify
- `src/types/donation.ts` (add status, duplicate_subscription_detected, needs_attention_reason, stripe_subscription_id)
- `src/App.tsx` (add /admin route)
- `src/App.test.tsx` (add admin route test)
- `src/components/Navigation.tsx` (add Admin link)
- `src/components/Navigation.test.tsx` (add Admin link test)

### Files to Remove
- `src/types/failedPayment.ts` (already deleted in cleanup)

---

### Related Tickets

**Depends On:**
- **TICKET-109** (Donation Status Infrastructure) - **REQUIRED** - Need status field on donations
- **TICKET-110** (Import Service) - **REQUIRED** - Need donations with status to display

**This Redesign:**
- **TICKET-112**: Validation & Merge (will test full workflow including UI)
- **TICKET-113**: Cleanup Old System (final cleanup after merge)

**Replaces:**
- TICKET-076 components (FailedPaymentsSection, FailedPaymentList) - Deleted during cleanup

**See:**
- docs/STRIPE_IMPORT_PLAN.md - UI mockups and design rationale
- backup/ticket-076-complete - Reference for card layout (but different data model)

---

### Success Criteria

**Definition of Done:**
- [ ] AdminPage renders with tabs
- [ ] Pending Review tab shows non-succeeded donations
- [ ] Status filter works (all, failed, refunded, canceled, needs_attention)
- [ ] Date range filters work (from/to)
- [ ] Pagination works (25 per page)
- [ ] Status badges color-coded correctly
- [ ] Duplicate subscription warnings display
- [ ] Needs attention reasons display
- [ ] Loading states work
- [ ] Empty state displays when no donations
- [ ] All Jest tests pass (80% frontend coverage)
- [ ] Admin link in navigation works
- [ ] /admin route loads page

**Ready for Next Ticket:**
- [ ] TICKET-112 can test full import → UI workflow
- [ ] Admin can review donations that need attention

---

### Notes
- **Follow Pure Presentation Pattern:** List component is pure presentation, Section manages state
- **Use MUI size="small":** Consistent with other forms/filters
- **Status Badge Colors:** failed=red, refunded=orange, canceled=gray, needs_attention=blue
- **Testing:** Follow strict TDD - write tests first, one at a time
- **Commit:** Commit to `feature/stripe-import-redesign` branch when complete
- **Reuse Patterns:** DonationFilters pattern, DonationList layout

---

*Created: 2025-11-14*
*Part of docs/STRIPE_IMPORT_PLAN.md Phase 3 (Admin UI)*
