## [TICKET-103] Date Range Donation Report

**Status:** ✅ Complete
**Priority:** 🔴 High
**Effort:** L (Large - 8-10 hours)
**Created:** 2025-11-12
**Completed:** 2026-01-06
**Dependencies:** TICKET-100 (Donor address field) ✅, TICKET-088 (CSV export pattern) ✅

### User Story
As a user, I want to view a donation report on the page for any date range showing each donation as an individual row so that I can review detailed transaction history and optionally export to CSV for Excel/accounting software.

### Problem Statement
**Current State:**
- No built-in reporting functionality
- Must manually export and process data for tax purposes
- Cannot quickly view donation reports for custom date ranges
- Difficult to review donor transaction history on screen
- No way to scan/verify data before exporting

**Desired State:**
- **View report data on page** (primary feature - table/grid display)
- **Optional CSV download** (secondary feature - for Excel/accounting software)
- Generate report for any date range (start date to end date)
- Each donation is a separate row (not aggregated)
- Include donor details (name, address, email, phone)
- Show donation totals: period total, year-to-date, all-time (per donor)
- Sortable/filterable table for easy data review

### Business Rules

**Report Scope:**
- **Time Period:** Custom date range (user-selected start and end dates)
- **Row Granularity:** One row per donation (not aggregated by donor)
- **Totals:** Calculate period total, year-to-date, all-time for each donor
- **Sorting:** Chronological by donation date (ascending)
- **Email Visibility:** Hide @mailinator.com emails (same pattern as TICKET-088)

### Acceptance Criteria

#### Backend Changes
- [x] Create `DonationReportService` with YARD documentation (CSV generation):
  - Class method: `generate_report(start_date:, end_date:)`
  - Returns CSV string (follows TICKET-088 DonorExportService pattern)
  - Include donor name, address, phone, email (hide @mailinator.com)
  - Calculate period total, year-to-date, all-time total (per donor using SQL aggregates)
  - Use `includes(:donor, :project)` to avoid N+1 queries

- [x] Add `DonationReportService.generate_json_report(start_date:, end_date:)`:
  - Returns hash with 3 sections: donations, donor_summary, project_summary ✅
  - Section 1 (donations): Array of donation rows with date formatted as "day month year" (e.g., "12 March 2025") ✅
  - Section 2 (donor_summary): Array of donor summary rows with period_total and all_time_total ✅
  - Section 3 (project_summary): Array of project summary rows with period_total and all_time_total ✅
  - Includes meta: { start_date, end_date, total_count, total_amount } ✅
  - Reuses existing helper methods (format_currency, project_or_child_name, compute_donor_totals) ✅

- [x] Add API endpoint `GET /api/reports/donations` (CSV download):
  - Query params: `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD)
  - Query param: `format=csv` (default) ✅
  - Validation: Dates required, start_date <= end_date ✅
  - Response: CSV file download via `send_data` ✅
  - Filename: `donations_report_YYYYMMDD_YYYYMMDD.csv` ✅

- [x] Update API endpoint to support JSON format:
  - Query param: `format=json` → returns JSON with 3-section structure ✅
  - Same validation as CSV endpoint ✅
  - Response structure: `{ donations: [...], donor_summary: [...], project_summary: [...], meta: {...} }` ✅

- [x] Add route: `config/routes.rb` → `namespace :api` → `get 'reports/donations'`

- [x] RSpec tests (14 tests - CSV service + JSON service + controller):
  - Service (CSV): Generates report for date range ✅
  - Service (CSV): Hides @mailinator.com emails (anonymous donors) ✅
  - Service (CSV): Calculates period total correctly (SQL aggregates) ✅
  - Service (CSV): Calculates year-to-date total correctly ✅
  - Service (CSV): Calculates all-time total correctly ✅
  - Service (CSV): Formats address correctly ✅
  - Service (CSV): Displays child name for sponsorships ✅
  - Service (JSON): Returns hash with three sections (donations, donor_summary, project_summary) ✅
  - Service (JSON): Formats date as "day month year" with simplified fields ✅
  - Service (JSON): Includes total_amount in meta ✅
  - Service (JSON): Includes donor summary with period and all-time totals ✅
  - Service (JSON): Includes project summary with period and all-time totals ✅
  - Controller: Returns CSV with correct headers and filename ✅
  - Controller: Returns JSON when format=json ✅
  - Controller: Validates date range (start_date <= end_date) ✅

#### Frontend Changes
- [x] Create ReportsPage component (download-only - initial version):
  - Navigate via `/reports` route ✅
  - MUI DatePicker (size="small") for start_date and end_date ✅
  - Download button (Download icon, variant="contained", fullWidth) ✅
  - Error handling with Snackbar + Alert ✅
  - Loading state during download ✅

- [x] Refactor ReportsPage to display data on page:
  - **Primary Feature:** MUI Tables to display 3-section report (Donations, Donor Summary, Project Summary) ✅
  - **Secondary Feature:** Download button (optional action) ✅
  - Layout: Date pickers → "Generate Report" button → Section 1 (Donations) → Section 2 (Donor Summary) → Section 3 (Project Summary) → Download CSV button ✅
  - Section 1: Donations table (6 columns: Date, Donor Name, Amount, Project/Child, Payment Method, All-Time Total) ✅
  - Section 2: Donor Summary table (4 columns: Expand Icon, Donor Name, Period Total, All-Time Total) with expandable rows ✅
  - Section 3: Project Summary table (4 columns: Expand Icon, Project Name, Period Total, All-Time Total) with expandable rows ✅
  - Loading state while fetching data ✅
  - Error handling with Snackbar + Alert ✅

- [x] Add Reports navigation tab to Navigation component ✅

- [x] Jest tests (16 tests - full 3-section report with expandable rows):
  - ReportsPage renders with date pickers and generate button ✅
  - Date pickers have correct default values (Jan 1 current year, today) ✅
  - Generate report button renders and is enabled ✅
  - Loading state shown during report generation ✅
  - Error handling with Snackbar when generation fails ✅
  - Fetches and displays report data with 3 sections ✅
  - Section 1 (Donations): Displays donation rows with all fields ✅
  - Section 1 (Donations): Shows total amount row ✅
  - Section 2 (Donor Summary): Displays donor summary rows with period/all-time totals ✅
  - Section 2 (Donor Summary): Rows collapsed by default ✅
  - Section 2 (Donor Summary): Expands donor row when clicked to show donations ✅
  - Section 2 (Donor Summary): Multiple donor rows can be expanded simultaneously ✅
  - Section 3 (Project Summary): Displays project summary rows with period/all-time totals ✅
  - Section 3 (Project Summary): Rows collapsed by default ✅
  - Section 3 (Project Summary): Expands project row when clicked to show donations ✅
  - Section 3 (Project Summary): Multiple project rows can be expanded simultaneously ✅
  - Download CSV button shown after report data is generated ✅

- [x] Cypress E2E tests (9 comprehensive scenarios):
  - Generate report with test data and verify display ✅
  - Expand donor summary row to show individual donations ✅
  - Expand project summary row to show project donations ✅
  - Expand child sponsorship project (bug fix verification) ✅
  - Filter report by custom date range ✅
  - Download CSV report ✅
  - Show total count and amount in metadata ✅
  - Collapse expanded rows when clicking again ✅
  - Shows download CSV button after report generation ✅

### Technical Implementation

#### Backend Service (follows TICKET-088 DonorExportService pattern)
```ruby
# frozen_string_literal: true

require "csv"

# app/services/donation_report_service.rb (NEW)
# Generates CSV export of donation report with per-donor aggregates.
#
# This service provides:
# - CSV export with donation details and donor contact info
# - Per-donor totals: period, year-to-date, all-time (using SQL aggregates)
# - Currency formatting (cents → dollars)
# - Email visibility (hides @mailinator.com for anonymous donors)
#
# Uses class method pattern for stateless CSV generation.
#
# @example Generate report for Q4 2025
#   csv_data = DonationReportService.generate_report(
#     start_date: Date.new(2025, 10, 1),
#     end_date: Date.new(2025, 12, 31)
#   )
#   send_data csv_data, filename: "donations_report_20251001_20251231.csv"
#
# @see Api::ReportsController#donations for controller usage
# @see DonorExportService for similar CSV export pattern
# @see TICKET-103 for implementation details
class DonationReportService
  HEADERS = [
    'Date',
    'Donor Name',
    'Email',
    'Phone',
    'Address',
    'Amount',
    'Project/Child',
    'Payment Method',
    'Period Total',
    'Year Total',
    'All-Time Total'
  ].freeze

  def self.generate_report(start_date:, end_date:)
    # Get donations with eager loading to avoid N+1
    donations = Donation
      .includes(:donor, :project, child: [])
      .where(date: start_date..end_date)
      .order(date: :asc)

    # Precompute donor totals using SQL aggregates
    donor_totals = compute_donor_totals(donations.pluck(:donor_id).uniq, start_date, end_date)

    generate_csv(donations, donor_totals, start_date, end_date)
  end

  # Compute totals for all donors using SQL (avoid N+1)
  def self.compute_donor_totals(donor_ids, start_date, end_date)
    totals = {}

    donor_ids.each do |donor_id|
      next unless donor_id

      period_total = Donation.where(donor_id: donor_id, date: start_date..end_date).sum(:amount)
      year_start = start_date.beginning_of_year
      year_end = start_date.end_of_year
      year_total = Donation.where(donor_id: donor_id, date: year_start..year_end).sum(:amount)
      all_time_total = Donation.where(donor_id: donor_id).sum(:amount)

      totals[donor_id] = {
        period: period_total,
        year: year_total,
        all_time: all_time_total
      }
    end

    totals
  end
  private_class_method :compute_donor_totals

  def self.generate_csv(donations, donor_totals, start_date, end_date)
    CSV.generate(headers: true) do |csv|
      csv << HEADERS

      donations.each do |donation|
        donor = donation.donor
        next unless donor # Skip if donor deleted

        totals = donor_totals[donor.id] || { period: 0, year: 0, all_time: 0 }

        csv << [
          donation.date.strftime('%Y-%m-%d'),
          donor.name,
          displayable_email(donor),
          donor.phone || '',
          format_address(donor),
          format_currency(donation.amount),
          project_or_child_name(donation),
          donation.payment_method,
          format_currency(totals[:period]),
          format_currency(totals[:year]),
          format_currency(totals[:all_time])
        ]
      end
    end
  end
  private_class_method :generate_csv

  def self.displayable_email(donor)
    # Hide @mailinator.com emails (anonymous donors) - same pattern as TICKET-088
    return '' if donor.email.to_s.include?('@mailinator.com')
    donor.email || ''
  end
  private_class_method :displayable_email

  def self.format_address(donor)
    # Format multi-line address as comma-separated (Excel-compatible)
    parts = [
      donor.address_line1,
      donor.address_line2,
      donor.city,
      [donor.state, donor.zip_code].compact.join(' '),
      donor.country
    ].compact.reject(&:empty?)

    parts.any? ? parts.join(', ') : ''
  end
  private_class_method :format_address

  def self.project_or_child_name(donation)
    return donation.child.name if donation.child.present?
    return donation.project.title if donation.project.present?
    ''
  end
  private_class_method :project_or_child_name

  def self.format_currency(cents)
    "$#{'%.2f' % (cents / 100.0)}"
  end
  private_class_method :format_currency
end
```

#### Backend Controller (uses Global Error Handling pattern)
```ruby
# frozen_string_literal: true

# app/controllers/api/reports_controller.rb (NEW - ~25 lines)
# Handles donation report generation and CSV downloads.
#
# This controller provides:
# - Date range donation reports (CSV download)
# - Validation for date range parameters
# - Uses DonationReportService for CSV generation
#
# Uses Global Error Handling (raises errors, ApplicationController handles them).
#
# @see DonationReportService for CSV generation logic
# @see TICKET-103 for implementation details
module Api
  class ReportsController < ApplicationController
    def donations
      # Parse and validate date params (raises ParameterMissing if missing)
      start_date = Date.parse(params.require(:start_date))
      end_date = Date.parse(params.require(:end_date))

      # Validate date range
      raise ArgumentError, 'start_date must be before or equal to end_date' if start_date > end_date

      # Generate CSV
      csv_data = DonationReportService.generate_report(
        start_date: start_date,
        end_date: end_date
      )

      # Send CSV file
      filename = "donations_report_#{start_date.strftime('%Y%m%d')}_#{end_date.strftime('%Y%m%d')}.csv"
      send_data csv_data,
        filename: filename,
        type: 'text/csv',
        disposition: 'attachment'
    end
  end
end
```

#### Backend Routes
```ruby
# config/routes.rb (ADD to existing namespace :api block)
namespace :api do
  # ... existing routes ...

  get 'reports/donations', to: 'reports#donations'
end
```

#### Frontend - ReportsPage (follows current patterns)
```tsx
// src/pages/ReportsPage.tsx (NEW - ~120 lines)
import React, { useState } from 'react';
import { Box, Typography, Button, Alert, Snackbar } from '@mui/material';
import { Download } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiClient from '../api/client';

const ReportsPage: React.FC = () => {
  // State
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(new Date().getFullYear(), 0, 1) // Default: Jan 1 of current year
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date()); // Default: today
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Download handler
  const handleDownload = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      setError('Start date must be before or equal to end date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/reports/donations', {
        params: {
          start_date: startDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
          end_date: endDate.toISOString().split('T')[0],
        },
        responseType: 'blob', // Important for file download
      });

      // Trigger file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `donations_report_${startDate.toISOString().split('T')[0].replace(/-/g, '')}_${endDate.toISOString().split('T')[0].replace(/-/g, '')}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h4" gutterBottom>
          Donation Reports
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Generate a detailed report showing each donation as an individual row with donor contact info and aggregated totals.
        </Typography>

        {/* Date Range Selectors */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
              },
            }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
              },
            }}
          />
        </Box>

        {/* Download Button */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<Download />}
          onClick={handleDownload}
          disabled={loading || !startDate || !endDate}
        >
          {loading ? 'Generating Report...' : 'Download CSV Report'}
        </Button>

        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default ReportsPage;
```

**No API client helper needed** - inline API call in component (simple download, not reused elsewhere)

#### Frontend - Router
```tsx
// src/App.tsx (ADD route to existing Routes)
import ReportsPage from './pages/ReportsPage';

<Route path="/reports" element={<ReportsPage />} />
```

#### Frontend - Navigation
```tsx
// src/components/Navigation.tsx (ADD Reports tab)
<Tabs value={currentTab} onChange={handleChange} aria-label="navigation tabs">
  <Tab label="Donors" component={Link} to="/donors" />
  <Tab label="Donations" component={Link} to="/donations" />
  <Tab label="Children" component={Link} to="/children" />
  <Tab label="Sponsorships" component={Link} to="/sponsorships" />
  <Tab label="Reports" component={Link} to="/reports" />  {/* ADD THIS */}
  <Tab label="Admin" component={Link} to="/admin" />
</Tabs>
```

### CSV Report Format

**Example: donations_report_20250101_20251231.csv**
```csv
Date,Donor Name,Email,Phone,Address,Amount,Project/Child,Payment Method,Period Total,Year Total,All-Time Total
2025-01-15,John Doe,john@example.com,555-1234,"123 Main St, San Francisco, CA 94102",$100.00,Sangwan,$100.00,$2500.00,$5000.00
2025-02-10,Jane Smith,jane@example.com,555-5678,"456 Oak Ave, Portland, OR 97201",$50.00,General Donation,$150.00,$600.00,$1200.00
2025-03-05,John Doe,john@example.com,555-1234,"123 Main St, San Francisco, CA 94102",$150.00,General Donation,$250.00,$2500.00,$5000.00
2025-04-20,Bob Johnson,,,,$25.00,Campaign ABC,$25.00,$300.00,$600.00
```

**Columns Explained:**
- **Date:** Donation date (YYYY-MM-DD)
- **Donor Name:** Full donor name
- **Email:** Donor email (hidden if @mailinator.com, empty if none)
- **Phone:** Donor phone number (empty if none)
- **Address:** Complete address comma-separated (empty if none)
- **Amount:** Donation amount in dollars (formatted: $XX.XX)
- **Project/Child:** Child name (if sponsorship) or Project title (empty if none)
- **Payment Method:** Payment method (e.g., online, check, cash)
- **Period Total:** Total donations by this donor during selected date range
- **Year Total:** Total donations by this donor in the year of start_date
- **All-Time Total:** Total donations by this donor across all time

### UX Design

**Reports Page (Simple - No Tabs):**
```
┌─────────────────────────────────────────┐
│  Donation Reports                       │
├─────────────────────────────────────────┤
│                                         │
│  Generate a detailed report showing     │
│  each donation as an individual row     │
│  with donor contact info and            │
│  aggregated totals.                     │
│                                         │
│  [Start Date: 01/01/2025  📅]          │
│  [End Date:   12/31/2025  📅]          │
│                                         │
│  [⬇ Download CSV Report]               │
│                                         │
└─────────────────────────────────────────┘
```

### Files to Create

**Backend:**
- `app/services/donation_report_service.rb` (NEW - ~140 lines with YARD docs + helper methods)
- `app/controllers/api/reports_controller.rb` (NEW - ~25 lines with YARD docs)
- `spec/services/donation_report_service_spec.rb` (NEW - 7 tests)
- `spec/requests/api/reports_spec.rb` (NEW - 2 tests)

**Frontend:**
- `src/pages/ReportsPage.tsx` (NEW - ~120 lines)
- `src/pages/ReportsPage.test.tsx` (NEW - 5 tests)
- `cypress/e2e/reports.cy.ts` (NEW - 1 test)

### Files to Modify

**Backend:**
- `config/routes.rb` (add `get 'reports/donations'` route - 1 line)

**Frontend:**
- `src/App.tsx` (add `/reports` route - 1 line)
- `src/components/Navigation.tsx` (add Reports tab - 1 line)

### Testing Strategy

**Backend RSpec (9 tests total):**

**Service Tests (7 tests):**
1. Generates report for date range with donations
2. Returns CSV with correct headers
3. Hides @mailinator.com emails (anonymous donors)
4. Calculates period total correctly (SQL aggregates)
5. Calculates year-to-date total correctly
6. Calculates all-time total correctly
7. Handles empty date range (no donations)

**Controller Tests (2 tests):**
1. GET /api/reports/donations returns CSV with correct filename format
2. GET /api/reports/donations validates date range (start_date <= end_date raises error)

**Frontend Jest (5 tests):**
1. ReportsPage renders with date pickers and download button
2. Start date picker updates state
3. End date picker updates state
4. Download button triggers API call with formatted dates (YYYY-MM-DD)
5. Loading state shown during download

**Cypress E2E (1 test):**
1. Navigate to Reports → select date range (Jan 1 - Dec 31) → click Download → verify CSV filename format

### Performance Considerations

**Query Optimization:**
- Use `includes(:donor, :project, child: [])` to avoid N+1 queries on associations
- Precompute donor totals using SQL aggregates (3 queries per donor instead of N+1)
- Index on `donations.date` already exists (TICKET-035)
- For large date ranges (>10,000 donations), consider streaming CSV or background job

**Memory Usage:**
- Current implementation loads all donations into memory
- For very large reports (>50,000 rows), consider `find_each` with CSV streaming
- Background job pattern (future enhancement): `ReportJob.perform_later(user, start_date, end_date)` → email CSV when ready

### Estimated Time
- Backend service (with SQL aggregates + helper methods): 2 hours
- Backend controller + routes: 30 minutes
- Backend tests: 1.5 hours
- Frontend ReportsPage (DatePicker setup + download): 1.5 hours
- Frontend tests: 1 hour
- E2E test: 30 minutes
- **Total:** ~7 hours (reduced from 8h due to simpler controller, no tabs in initial version)

### Success Criteria
- [x] Date range report generates CSV with all donations between start_date and end_date ✅
- [x] Each donation is a separate row in Section 1 (not aggregated by donor) ✅
- [x] CSV includes donor name, address, phone, email (hides @mailinator.com) ✅
- [x] Includes donation details: date, amount, project/child, payment method ✅
- [x] Calculates per-donor totals: period total, year-to-date, all-time ✅
- [x] CSV downloads with correct filename format: `donations_report_YYYYMMDD_YYYYMMDD.csv` ✅
- [x] Date range validation works (start_date <= end_date) ✅
- [x] Reports navigation tab appears in main navigation ✅
- [x] **Report data displays on page in 3-section format** (primary feature) ✅
- [x] **Section 1 (Donations): Shows all donations with 6 columns (Date, Donor Name, Amount, Project/Child, Payment Method, All-Time Total)** ✅
- [x] **Section 1 (Donations): Date formatted as "day month year" (e.g., "12 March 2025")** ✅
- [x] **Section 1 (Donations): Shows total amount row at end** ✅
- [x] **Section 2 (Donor Summary): Shows donor summary with period total and all-time total** ✅
- [x] **Section 2 (Donor Summary): Rows expandable to show all donations by that donor** ✅
- [x] **Section 2 (Donor Summary): Expand icon rotates, multiple rows can be expanded simultaneously** ✅
- [x] **Section 3 (Project Summary): Shows project summary with period total and all-time total** ✅
- [x] **Section 3 (Project Summary): Rows expandable to show all donations to that project** ✅
- [x] **Section 3 (Project Summary): Expand icon rotates, multiple rows can be expanded simultaneously** ✅
- [x] **Download CSV button available as optional action** (secondary feature) ✅
- [x] All tests passing (14 RSpec + 16 Jest, Cypress pending)

### Code Reuse & DRY Opportunities

**Shared Formatting Methods (TICKET-088 vs TICKET-103):**

Both `DonorExportService` and `DonationReportService` use identical helper methods:
- `format_currency(cents)` - Convert cents to "$XX.XX" format
- `displayable_email(donor)` - Hide @mailinator.com emails
- `format_address(donor)` - Format multi-line address as comma-separated string

**Decision: Keep Services Separate, Extract Formatters Later**

**Why separate services:**
- Different responsibilities (SRP): Donor export = contact list, Donation report = financial audit
- Different query structures: Donor export aggregates by donor, Donation report lists individual donations
- Different column structures and use cases
- Services are small enough (~140 lines each) that coupling would add complexity

**Future DRY improvement (optional - not in this ticket):**
Create `app/services/concerns/csv_formatting.rb`:
```ruby
module CsvFormatting
  def format_currency(cents)
    "$#{'%.2f' % (cents / 100.0)}"
  end

  def displayable_email(donor)
    return '' if donor.email.to_s.include?('@mailinator.com')
    donor.email || ''
  end

  def format_address(donor)
    parts = [donor.address_line1, donor.address_line2, donor.city,
             [donor.state, donor.zip_code].compact.join(' '),
             donor.country].compact.reject(&:empty?)
    parts.any? ? parts.join(', ') : ''
  end
end

class DonorExportService
  extend CsvFormatting
end

class DonationReportService
  extend CsvFormatting
end
```

**Recommendation:** Implement TICKET-103 with duplicate formatting methods (3 methods × ~5 lines = 15 lines duplication). If we add more CSV export services (TICKET-104, TICKET-105, TICKET-133), then extract to shared concern. Premature abstraction would add complexity for minimal benefit now.

### Related Tickets
- TICKET-100: Add Physical Address to Donor Records ✅ (provides address fields for report)
- TICKET-088: Donor Export to CSV ✅ (establishes CSV export pattern to follow)
- TICKET-104: Quarterly Donation Report (future - could add tabs to ReportsPage)
- TICKET-105: Annual Donation Report (future - could add tabs to ReportsPage)
- TICKET-133: Individual Donor Giving Statements (future - builds on report infrastructure)

### Notes
- **Scope Change 1 (2025-12-08):** Changed from monthly (month/year selectors) to date range (start/end date pickers) for flexibility
- **Scope Change 2 (2025-12-26):** Changed from download-only to in-page data display + optional download
  - **Reason:** User wants to review data on screen before exporting
  - **Impact:** Requires JSON API endpoint, frontend table/grid component, updated tests
  - **Initial implementation (download-only) completed:** Backend service ✅, CSV endpoint ✅, ReportsPage with download ✅
  - **Scope change completed:** JSON endpoint ✅, 3-section table display ✅, refactored tests ✅
- **Scope Change 3 (2026-01-05):** Added expandable rows to Donor Summary and Project Summary sections
  - **Reason:** User wants to drill down into specific donor/project donations within the report
  - **Implementation:**
    - Section 2 (Donor Summary): Click donor name → expand to show all donations by that donor in date range
    - Section 3 (Project Summary): Click project name → expand to show all donations to that project in date range
    - Visual indicators: ExpandMore icon rotates 180° when expanded, hover effect on rows
    - State management: Set<string> to track expanded donors/projects, allows multiple simultaneous expansions
    - Default: All rows collapsed when report loads
    - MUI components: IconButton, Collapse (with animation), nested Table in grey.50 background box
  - **Tests Added:** 4 new Jest tests (2 per section: collapsed by default, expand on click, multiple simultaneous expansions)
  - **All tests GREEN:** 14 RSpec + 16 Jest ✅
- **Bug Fix (2026-01-06):** Child sponsorship projects didn't show donations when expanded in Project Summary
  - **Root Cause:** Filter matched by name ("Sangwan" child name vs "Sponsor Sangwan" project title) instead of project_id
  - **Solution:**
    - Backend: Added `project_id` field to both `donations` array and `project_summary` array in JSON response
    - Frontend: Changed filter from `d.project_or_child === row.project_name` to `d.project_id === row.project_id`
    - Tests: Added RSpec test for child sponsorship scenario, added Jest test for expansion, added Cypress E2E test
  - **Files Changed:**
    - `donation_report_service.rb`: Added `project_id` to JSON response (lines 101, 127)
    - `donation_report_service_spec.rb`: Added test for child sponsorship with project_id verification
    - `ReportsPage.tsx`: Updated TypeScript interfaces and filter logic (lines 24-45, 340)
    - `ReportsPage.test.tsx`: Added test case for child sponsorship expansion (lines 696-760)
    - `reports.cy.ts`: Added E2E test for bug fix verification
    - `tsconfig.json`: Changed target from es5 to es2015 (fixes Cypress webpack template string compilation bug)
  - **All tests GREEN:** 15 RSpec + 17 Jest + 9 Cypress E2E ✅
- **Tax Purposes:** This report helps users generate financial statements for any period (monthly, quarterly, custom)
- **Audit Trail:** Individual donation rows provide complete transaction history with donor contact info
- **Future Enhancement:** Add tabs for Monthly/Quarterly/Annual preset ranges (TICKET-104, TICKET-105)
- **Future Enhancement:** Add filters for payment method, project type, donor
- **Future Enhancement:** Email report automatically (scheduled job)
- **Future Enhancement:** PDF generation with organization branding
- **Excel Compatibility:** CSV format opens in Excel, Google Sheets, accounting software
- **Performance:** For very large reports (>50,000 rows), consider background job with email delivery
