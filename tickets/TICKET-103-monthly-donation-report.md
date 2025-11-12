## [TICKET-103] Monthly Donation Report

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** M (Medium - 4-5 hours)
**Created:** 2025-11-12
**Dependencies:** TICKET-100 (Donor address field) - for address in report

### User Story
As a user, I want to generate a monthly donation report showing each donation as an individual row so that I can review detailed transaction history and prepare financial statements.

### Problem Statement
**Current State:**
- No built-in reporting functionality
- Must manually export and process data for tax purposes
- Cannot quickly generate monthly donation summaries
- Difficult to provide donors with transaction history

**Desired State:**
- Generate report for any month/year
- Each donation is a separate row (not aggregated)
- Include donor details (name, address, email)
- Show donation totals: month, year, all-time
- Export to CSV for Excel/accounting software

### Business Rules

**Report Scope:**
- **Time Period:** Single month (user-selected)
- **Row Granularity:** One row per donation (not aggregated by donor)
- **Totals:** Calculate month total, year-to-date, all-time for each donation
- **Sorting:** Chronological by donation date
- **Filtering:** Optionally filter by donor, project, payment method

### Acceptance Criteria

#### Backend Changes
- [ ] Create `DonationReportService`:
  - Method: `generate_monthly_report(month:, year:, filters: {})`
  - Return donation records with computed totals
  - Include donor name, address, email
  - Calculate month total, year total, all-time total (per donor)

- [ ] Add API endpoint `GET /api/reports/monthly`:
  - Query params: `month`, `year`, `donor_id` (optional), `project_id` (optional)
  - Response: CSV file download
  - Filename: `monthly_donations_YYYY_MM.csv`

- [ ] RSpec tests (6 new tests):
  - Service: Generates report for specified month
  - Service: Calculates month total correctly
  - Service: Calculates year-to-date total correctly
  - Service: Calculates all-time total correctly
  - Controller: Returns CSV with correct headers
  - Controller: Filters by donor when provided

#### Frontend Changes
- [ ] Create ReportsPage component:
  - Navigate via `/reports` route
  - Tab layout: Monthly, Quarterly, Annual
  - Month/year selector
  - Optional donor/project filters
  - Download CSV button

- [ ] Add Reports navigation tab

- [ ] Jest tests (4 new tests):
  - ReportsPage renders
  - Month/year selector updates state
  - Download button triggers API call
  - CSV download initiated

- [ ] Cypress E2E test (1 scenario):
  - Select month → download report → verify CSV file

### Technical Implementation

#### Backend Service
```ruby
# app/services/donation_report_service.rb (NEW)
class DonationReportService
  def self.generate_monthly_report(month:, year:, filters: {})
    # Get donations for month
    start_date = Date.new(year, month, 1)
    end_date = start_date.end_of_month

    donations = Donation
      .includes(:donor, :project)
      .where(date: start_date..end_date)

    # Apply optional filters
    donations = donations.where(donor_id: filters[:donor_id]) if filters[:donor_id].present?
    donations = donations.where(project_id: filters[:project_id]) if filters[:project_id].present?

    # Order by date
    donations = donations.order(date: :asc)

    # Generate CSV
    generate_csv(donations, start_date, end_date)
  end

  private

  def self.generate_csv(donations, start_date, end_date)
    CSV.generate(headers: true) do |csv|
      # Headers
      csv << [
        'Date',
        'Donor Name',
        'Address',
        'Email',
        'Amount',
        'Project',
        'Payment Method',
        'Month Total',
        'Year Total',
        'All-Time Total'
      ]

      # Group by donor for totals
      donations_by_donor = donations.group_by(&:donor_id)

      donations.each do |donation|
        donor = donation.donor
        next unless donor  # Skip if donor deleted

        # Calculate totals for this donor
        month_total = donor.donations
          .where(date: start_date..end_date)
          .sum(:amount)

        year_total = donor.donations
          .where(date: start_date.beginning_of_year..start_date.end_of_year)
          .sum(:amount)

        all_time_total = donor.donations.sum(:amount)

        csv << [
          donation.date.strftime('%Y-%m-%d'),
          donor.name,
          donor.full_address&.gsub("\n", ', ') || 'N/A',
          donor.displayable_email || donor.email,
          (donation.amount / 100.0).round(2),
          donation.project&.title || 'N/A',
          donation.payment_method,
          (month_total / 100.0).round(2),
          (year_total / 100.0).round(2),
          (all_time_total / 100.0).round(2)
        ]
      end
    end
  end
end
```

#### Backend Controller
```ruby
# app/controllers/api/reports_controller.rb (NEW)
class Api::ReportsController < ApplicationController
  def monthly
    month = params[:month].to_i
    year = params[:year].to_i

    # Validation
    unless (1..12).include?(month) && (2000..2100).include?(year)
      render json: { error: 'Invalid month or year' }, status: :unprocessable_entity
      return
    end

    filters = {
      donor_id: params[:donor_id],
      project_id: params[:project_id]
    }.compact

    csv_data = DonationReportService.generate_monthly_report(
      month: month,
      year: year,
      filters: filters
    )

    send_data csv_data,
      filename: "monthly_donations_#{year}_#{month.to_s.rjust(2, '0')}.csv",
      type: 'text/csv',
      disposition: 'attachment'
  end
end
```

#### Backend Routes
```ruby
# config/routes.rb (ADD)
namespace :api do
  namespace :reports do
    get 'monthly', to: 'reports#monthly'
    get 'quarterly', to: 'reports#quarterly'  # TICKET-104
    get 'annual', to: 'reports#annual'        # TICKET-105
  end
end
```

#### Frontend - ReportsPage
```tsx
// src/pages/ReportsPage.tsx (NEW)
import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Select, MenuItem, Button } from '@mui/material';
import { Download } from '@mui/icons-material';
import { downloadMonthlyReport } from '../api/client';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const handleDownloadMonthly = async () => {
    setLoading(true);
    try {
      const response = await downloadMonthlyReport(month, year);

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monthly_donations_${year}_${String(month).padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
        <Tab label="Monthly" />
        <Tab label="Quarterly" disabled />
        <Tab label="Annual" disabled />
      </Tabs>

      {/* Monthly Report Tab */}
      {activeTab === 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Monthly Donation Report
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Download a detailed report showing each donation as an individual row.
          </Typography>

          {/* Month/Year Selector */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value={1}>January</MenuItem>
              <MenuItem value={2}>February</MenuItem>
              <MenuItem value={3}>March</MenuItem>
              <MenuItem value={4}>April</MenuItem>
              <MenuItem value={5}>May</MenuItem>
              <MenuItem value={6}>June</MenuItem>
              <MenuItem value={7}>July</MenuItem>
              <MenuItem value={8}>August</MenuItem>
              <MenuItem value={9}>September</MenuItem>
              <MenuItem value={10}>October</MenuItem>
              <MenuItem value={11}>November</MenuItem>
              <MenuItem value={12}>December</MenuItem>
            </Select>

            <Select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 120 }}
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </Box>

          {/* Download Button */}
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadMonthly}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Download CSV'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ReportsPage;
```

#### Frontend - API Client
```typescript
// src/api/client.ts (ADD)
export const downloadMonthlyReport = (month: number, year: number) => {
  return apiClient.get('/api/reports/monthly', {
    params: { month, year },
    responseType: 'blob'  // Important for file download
  });
};
```

#### Frontend - Router
```tsx
// src/App.tsx (UPDATE)
import ReportsPage from './pages/ReportsPage';

<Route path="/reports" element={<ReportsPage />} />
```

### CSV Report Format

**Example: monthly_donations_2025_11.csv**
```csv
Date,Donor Name,Address,Email,Amount,Project,Payment Method,Month Total,Year Total,All-Time Total
2025-11-01,John Doe,"123 Main St, San Francisco CA 94102",john@example.com,100.00,Sangwan Sponsorship,online,250.00,2500.00,5000.00
2025-11-05,Jane Smith,"456 Oak Ave, Portland OR 97201",jane@example.com,50.00,General Donation,check,50.00,600.00,1200.00
2025-11-10,John Doe,"123 Main St, San Francisco CA 94102",john@example.com,150.00,General Donation,online,250.00,2500.00,5000.00
2025-11-15,Bob Johnson,"",bob_auto_123@example.com,25.00,Campaign ABC,online,25.00,300.00,600.00
```

**Columns Explained:**
- **Date:** Donation date (YYYY-MM-DD)
- **Donor Name:** Full name
- **Address:** Complete address (comma-separated, or "N/A")
- **Email:** Donor email (or "N/A")
- **Amount:** Donation amount in dollars
- **Project:** Project/child name (or "N/A")
- **Payment Method:** online/check/cash
- **Month Total:** Total donations by this donor in selected month
- **Year Total:** Total donations by this donor in selected year
- **All-Time Total:** Total donations by this donor across all time

### UX Design

**Reports Page:**
```
┌─────────────────────────────────────────┐
│  Reports                                │
├─────────────────────────────────────────┤
│  [Monthly] [Quarterly] [Annual]         │
├─────────────────────────────────────────┤
│                                         │
│  Monthly Donation Report                │
│  Download a detailed report showing     │
│  each donation as an individual row.    │
│                                         │
│  [November  ▼]  [2025  ▼]              │
│                                         │
│  [⬇ Download CSV]                      │
│                                         │
└─────────────────────────────────────────┘
```

### Files to Create

**Backend:**
- `app/services/donation_report_service.rb` (NEW - ~80 lines)
- `app/controllers/api/reports_controller.rb` (NEW - ~30 lines)
- `spec/services/donation_report_service_spec.rb` (NEW - 6 tests)
- `spec/requests/api/reports_spec.rb` (NEW - 3 tests)

**Frontend:**
- `src/pages/ReportsPage.tsx` (NEW - ~150 lines)
- `src/pages/ReportsPage.test.tsx` (NEW - 4 tests)
- `cypress/e2e/reports.cy.ts` (NEW - 1 test)

### Files to Modify

**Backend:**
- `config/routes.rb` (add reports routes)

**Frontend:**
- `src/App.tsx` (add /reports route)
- `src/components/Navigation.tsx` (add Reports tab)
- `src/api/client.ts` (add downloadMonthlyReport method)

### Testing Strategy

**Backend RSpec (6 tests):**
1. Service generates report for November 2025
2. Service calculates month total correctly (sum of donations in month)
3. Service calculates year-to-date total correctly
4. Service calculates all-time total correctly
5. Controller returns CSV with correct headers
6. Controller filters donations by donor_id when provided

**Frontend Jest (4 tests):**
1. ReportsPage renders with month/year selectors
2. Month selector updates state
3. Download button triggers API call with correct params
4. Loading state shown during download

**Cypress E2E (1 test):**
1. Navigate to Reports → select November 2025 → click Download → verify CSV file initiated

### Performance Considerations

**Large Datasets:**
- For orgs with >10,000 donations/month, consider:
  - Pagination or streaming CSV generation
  - Background job processing (send email when ready)
  - Caching frequently-requested reports

**Query Optimization:**
- Use `includes(:donor, :project)` to avoid N+1 queries
- Index on `donations.date` for fast range queries
- Consider materialized view for donor totals (future)

### Estimated Time
- Backend service: 2 hours
- Backend controller + routes: 1 hour
- Backend tests: 1.5 hours
- Frontend ReportsPage: 2 hours
- Frontend tests: 1 hour
- E2E test: 30 minutes
- **Total:** 8 hours

### Success Criteria
- [ ] Monthly report generates CSV with all donations for selected month
- [ ] Each donation is a separate row (not aggregated)
- [ ] Includes donor name, address, email
- [ ] Calculates month total, year total, all-time total per donor
- [ ] CSV downloads with proper filename
- [ ] All tests passing (RSpec + Jest + Cypress)

### Related Tickets
- TICKET-100: Add Physical Address to Donor Records ✅ (required for address in report)
- TICKET-104: Quarterly Donation Report (same page, different tab)
- TICKET-105: Annual Donation Report (same page, different tab)
- TICKET-088: Donor Export to CSV (similar export pattern)

### Notes
- **Tax Purposes:** This report helps donors reconcile donations for tax returns
- **Audit Trail:** Individual donation rows provide complete transaction history
- **Future Enhancement:** Add filters for payment method, project type
- **Future Enhancement:** Email report automatically at end of month
- **Future Enhancement:** PDF generation with organization branding
- **Excel Compatibility:** CSV format opens in Excel, Google Sheets, accounting software
