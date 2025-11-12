## [TICKET-105] Annual Donation Report

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** S (Small - 2-3 hours)
**Created:** 2025-11-12
**Dependencies:** TICKET-100 (Donor address), TICKET-103 (ReportsPage), TICKET-104 (Quarterly report pattern)

### User Story
As a user, I want to generate an annual donation report consolidated by donor so that I can prepare year-end tax receipts, analyze yearly trends, and report to stakeholders.

### Problem Statement
**Current State:**
- No annual reporting functionality
- Must manually calculate year-end totals for tax receipts
- Cannot easily analyze year-over-year trends
- Difficult to prepare annual stakeholder reports

**Desired State:**
- Generate report for any year
- One row per donor (aggregated)
- Show year total and all-time total
- Show gross amount given and net amount received (after Stripe fees)
- Export to CSV for tax receipts and annual reports

### Business Rules

**Report Scope:**
- **Time Period:** Single calendar year (user-selected)
- **Row Granularity:** One row per donor (aggregated)
- **Gross vs Net:** Show total donated AND total received (after Stripe fees)
- **Stripe Fees:** Calculate approximate 2.9% + $0.30 per transaction
- **Sorting:** Alphabetical by donor name OR by total amount (descending)
- **Filtering:** Optionally filter by donor

### Acceptance Criteria

#### Backend Changes
- [ ] Update `DonationReportService`:
  - Method: `generate_annual_report(year:, filters: {})`
  - Aggregate donations by donor for entire year
  - Calculate gross amount (total donated)
  - Calculate net amount (after estimated Stripe fees)
  - Calculate all-time total per donor
  - Support sorting by name or amount

- [ ] Add API endpoint `GET /api/reports/annual`:
  - Query params: `year`, `donor_id` (optional), `sort_by` (name/amount)
  - Response: CSV file download
  - Filename: `annual_donations_YYYY.csv`

- [ ] RSpec tests (6 new tests):
  - Service: Generates report for 2025
  - Service: Aggregates donations by donor correctly
  - Service: Calculates gross amount correctly
  - Service: Calculates net amount (after fees) correctly
  - Service: Sorts by name when sort_by=name
  - Service: Sorts by amount when sort_by=amount

#### Frontend Changes
- [ ] Update ReportsPage (TICKET-103):
  - Enable "Annual" tab
  - Add year selector
  - Add sort selector (Name/Amount)
  - Download CSV button

- [ ] Jest tests (3 new tests):
  - Annual tab renders year selector
  - Sort selector updates state
  - Download button triggers API call

- [ ] Cypress E2E test (1 scenario):
  - Select 2025 → download → verify CSV file

### Technical Implementation

#### Backend Service
```ruby
# app/services/donation_report_service.rb (UPDATE)
class DonationReportService
  # ... existing monthly and quarterly methods ...

  def self.generate_annual_report(year:, filters: {})
    # Get start/end dates for year
    start_date = Date.new(year, 1, 1)
    end_date = Date.new(year, 12, 31)

    # Get all donations for year
    donations = Donation
      .includes(:donor, :project)
      .where(date: start_date..end_date)

    # Apply optional filters
    donations = donations.where(donor_id: filters[:donor_id]) if filters[:donor_id].present?

    # Group by donor
    donations_by_donor = donations.group_by(&:donor_id)

    # Generate CSV
    generate_annual_csv(donations_by_donor, year, filters[:sort_by] || 'name')
  end

  private

  def self.generate_annual_csv(donations_by_donor, year, sort_by)
    CSV.generate(headers: true) do |csv|
      # Headers
      csv << [
        'Donor Name',
        'Address',
        'Email',
        'Donation Count',
        'Year Total Given',
        'Year Total Received',
        'All-Time Total Given',
        'All-Time Total Received',
        'Average Donation',
        'First Donation Date',
        'Last Donation Date'
      ]

      # Get donors and calculate totals
      donor_data = donations_by_donor.map do |donor_id, donations|
        donor = Donor.find(donor_id)

        # Year totals
        year_gross = donations.sum(&:amount)
        year_net = calculate_net_amount(donations)

        # All-time totals
        all_time_donations = donor.donations
        all_time_gross = all_time_donations.sum(&:amount)
        all_time_net = calculate_net_amount(all_time_donations)

        # Additional metrics
        donation_count = donations.count
        average_donation = donation_count > 0 ? (year_gross / donation_count.to_f) : 0
        first_donation = donor.donations.minimum(:date)
        last_donation = donor.donations.maximum(:date)

        {
          donor: donor,
          year_gross: year_gross,
          year_net: year_net,
          all_time_gross: all_time_gross,
          all_time_net: all_time_net,
          donation_count: donation_count,
          average_donation: average_donation,
          first_donation: first_donation,
          last_donation: last_donation
        }
      end

      # Sort
      donor_data = case sort_by
      when 'amount'
        donor_data.sort_by { |d| -d[:year_gross] }  # Descending by amount
      else
        donor_data.sort_by { |d| d[:donor].name }   # Alphabetical
      end

      # Output rows
      donor_data.each do |data|
        donor = data[:donor]

        csv << [
          donor.name,
          donor.full_address&.gsub("\n", ', ') || 'N/A',
          donor.displayable_email || donor.email,
          data[:donation_count],
          format_currency(data[:year_gross]),
          format_currency(data[:year_net]),
          format_currency(data[:all_time_gross]),
          format_currency(data[:all_time_net]),
          format_currency(data[:average_donation]),
          data[:first_donation]&.strftime('%Y-%m-%d') || 'N/A',
          data[:last_donation]&.strftime('%Y-%m-%d') || 'N/A'
        ]
      end
    end
  end

  # Reuse from TICKET-104
  def self.calculate_net_amount(donations)
    donations.reduce(0) do |total, donation|
      if donation.payment_method == 'online'
        fee = (donation.amount * 0.029).round + 30
        total + (donation.amount - fee)
      else
        total + donation.amount
      end
    end
  end

  def self.format_currency(cents)
    (cents / 100.0).round(2)
  end
end
```

#### Backend Controller
```ruby
# app/controllers/api/reports_controller.rb (UPDATE)
def annual
  year = params[:year].to_i

  # Validation
  unless (2000..2100).include?(year)
    render json: { error: 'Invalid year' }, status: :unprocessable_entity
    return
  end

  filters = {
    donor_id: params[:donor_id],
    sort_by: params[:sort_by] || 'name'
  }.compact

  csv_data = DonationReportService.generate_annual_report(
    year: year,
    filters: filters
  )

  send_data csv_data,
    filename: "annual_donations_#{year}.csv",
    type: 'text/csv',
    disposition: 'attachment'
end
```

#### Frontend - ReportsPage Update
```tsx
// src/pages/ReportsPage.tsx (UPDATE)
const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState('name');

  const handleDownloadAnnual = async () => {
    setLoading(true);
    try {
      const response = await downloadAnnualReport(year, sortBy);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `annual_donations_${year}.csv`);
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
      <Typography variant="h4" gutterBottom>Reports</Typography>

      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
        <Tab label="Monthly" />
        <Tab label="Quarterly" />
        <Tab label="Annual" />
      </Tabs>

      {/* Monthly Tab (existing) */}
      {/* Quarterly Tab (existing) */}

      {/* Annual Tab (NEW) */}
      {activeTab === 2 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Annual Donation Report
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Download a year-end report showing donations consolidated by donor, with metrics for tax receipts and analysis.
          </Typography>

          {/* Year/Sort Selector */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="name">Sort by Name</MenuItem>
              <MenuItem value="amount">Sort by Amount</MenuItem>
            </Select>
          </Box>

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadAnnual}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Download CSV'}
          </Button>
        </Box>
      )}
    </Box>
  );
};
```

#### Frontend - API Client
```typescript
// src/api/client.ts (ADD)
export const downloadAnnualReport = (year: number, sortBy: string) => {
  return apiClient.get('/api/reports/annual', {
    params: { year, sort_by: sortBy },
    responseType: 'blob'
  });
};
```

### CSV Report Format

**Example: annual_donations_2025.csv**
```csv
Donor Name,Address,Email,Donation Count,Year Total Given,Year Total Received,All-Time Total Given,All-Time Total Received,Average Donation,First Donation Date,Last Donation Date
John Doe,"123 Main St, San Francisco CA 94102",john@example.com,24,3000.00,2904.00,6000.00,5808.00,125.00,2023-01-15,2025-12-10
Jane Smith,"456 Oak Ave, Portland OR 97201",jane@example.com,12,1200.00,1161.92,2400.00,2323.84,100.00,2024-03-01,2025-11-20
Bob Johnson,"",bob@example.com,36,900.00,868.44,1800.00,1736.88,25.00,2022-06-10,2025-12-05
```

**Columns Explained:**
- **Donor Name/Address/Email:** Donor details
- **Donation Count:** Number of donations in year
- **Year Total Given:** Total donated in year
- **Year Total Received:** Net after Stripe fees in year
- **All-Time Total Given/Received:** Lifetime totals
- **Average Donation:** Year total ÷ donation count
- **First Donation Date:** First donation ever (not just this year)
- **Last Donation Date:** Most recent donation ever

### UX Design

**Reports Page - Annual Tab:**
```
┌─────────────────────────────────────────┐
│  Reports                                │
├─────────────────────────────────────────┤
│  [Monthly] [Quarterly] [Annual]         │
├─────────────────────────────────────────┤
│                                         │
│  Annual Donation Report                 │
│  Download a year-end report showing     │
│  donations consolidated by donor, with  │
│  metrics for tax receipts and analysis. │
│                                         │
│  [2025  ▼]  [Sort by Name  ▼]          │
│                                         │
│  [⬇ Download CSV]                      │
│                                         │
└─────────────────────────────────────────┘
```

### Use Cases

**1. Year-End Tax Receipts:**
- Download 2025 report (sorted by name)
- Mail tax receipts to all donors with year total

**2. Major Donor Analysis:**
- Download 2025 report (sorted by amount)
- Identify top donors for thank-you calls

**3. Donor Retention Analysis:**
- Compare 2024 vs 2025 reports
- Identify lapsed donors (donated in 2024 but not 2025)

**4. Annual Board Report:**
- Download report to show donor count, average gift, retention rates

### Files to Modify

**Backend:**
- `app/services/donation_report_service.rb` (add annual method, +70 lines)
- `app/controllers/api/reports_controller.rb` (add annual action, +20 lines)
- `spec/services/donation_report_service_spec.rb` (add 6 tests)
- `spec/requests/api/reports_spec.rb` (add 3 tests)

**Frontend:**
- `src/pages/ReportsPage.tsx` (add annual tab, +50 lines)
- `src/api/client.ts` (add downloadAnnualReport method)
- `src/pages/ReportsPage.test.tsx` (add 3 tests)
- `cypress/e2e/reports.cy.ts` (add 1 test)

### Testing Strategy

**Backend RSpec (6 tests):**
1. Service generates report for 2025
2. Service aggregates donations by donor
3. Service calculates gross amount correctly
4. Service calculates net amount (after fees) correctly
5. Service sorts by name when sort_by=name
6. Service sorts by amount (descending) when sort_by=amount

**Frontend Jest (3 tests):**
1. Annual tab renders year selector
2. Sort selector updates state
3. Download button triggers API call with year and sort_by

**Cypress E2E (1 test):**
1. Navigate to Reports → Annual tab → select 2025 → download → verify CSV

### Estimated Time
- Backend service method: 1.5 hours
- Backend controller: 30 minutes
- Backend tests: 1 hour
- Frontend annual tab: 1 hour
- Frontend tests: 30 minutes
- E2E test: 30 minutes
- **Total:** 5 hours

### Success Criteria
- [ ] Annual report generates CSV with one row per donor
- [ ] Shows year total and all-time total (gross and net)
- [ ] Includes donation count, average donation, first/last donation dates
- [ ] Supports sorting by name or amount
- [ ] CSV downloads with proper filename
- [ ] All tests passing (RSpec + Jest + Cypress)

### Related Tickets
- TICKET-100: Add Physical Address to Donor Records ✅ (required for address in report)
- TICKET-103: Monthly Donation Report ✅ (ReportsPage foundation)
- TICKET-104: Quarterly Donation Report ✅ (pattern and fee calculation reused)
- TICKET-077: Last Donation Date Tracking ✅ (uses last_donation_date)

### Notes
- **Tax Receipts:** Primary use case for year-end donor tax documentation
- **Donor Insights:** Additional metrics (average, frequency) help analyze donor behavior
- **Sorting:** Amount sorting identifies major donors; name sorting for mailing lists
- **Future Enhancement:** Add donor retention rate (% of prior year donors who gave again)
- **Future Enhancement:** Add year-over-year comparison (2024 vs 2025 totals)
- **Future Enhancement:** Add donor lifecycle stage (new, retained, lapsed)
- **Excel Compatibility:** CSV opens in Excel, Google Sheets for pivot tables and charts
