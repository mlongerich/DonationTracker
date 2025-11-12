## [TICKET-104] Quarterly Donation Report

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** M (Medium - 4-5 hours)
**Created:** 2025-11-12
**Dependencies:** TICKET-100 (Donor address), TICKET-103 (ReportsPage foundation)

### User Story
As a user, I want to generate a quarterly donation report consolidated by donor so that I can see donation patterns, track donor engagement, and prepare quarterly tax receipts.

### Problem Statement
**Current State:**
- No aggregated donor reporting
- Cannot easily see donor-level giving patterns
- Must manually calculate quarterly totals
- No visibility into net revenue after Stripe fees

**Desired State:**
- Generate report for any quarter/year (Q1, Q2, Q3, Q4)
- One row per donor (aggregated donations)
- Show gross amount given and net amount received (after Stripe fees)
- Include monthly breakdown within quarter
- Export to CSV for tax receipts and donor communications

### Business Rules

**Report Scope:**
- **Time Period:** Single quarter (user-selected Q1/Q2/Q3/Q4 + year)
- **Row Granularity:** One row per donor (aggregated)
- **Gross vs Net:** Show total donated AND total received (after Stripe fees)
- **Stripe Fees:** Calculate approximate 2.9% + $0.30 per transaction
- **Sorting:** Alphabetical by donor name
- **Filtering:** Optionally filter by donor

### Quarter Definitions
- **Q1:** January - March
- **Q2:** April - June
- **Q3:** July - September
- **Q4:** October - December

### Acceptance Criteria

#### Backend Changes
- [ ] Update `DonationReportService`:
  - Method: `generate_quarterly_report(quarter:, year:, filters: {})`
  - Aggregate donations by donor for quarter
  - Calculate gross amount (total donated)
  - Calculate net amount (after estimated Stripe fees)
  - Include month-by-month breakdown (Jan/Feb/Mar for Q1, etc.)
  - Calculate year total and all-time total per donor

- [ ] Add API endpoint `GET /api/reports/quarterly`:
  - Query params: `quarter` (1-4), `year`, `donor_id` (optional)
  - Response: CSV file download
  - Filename: `quarterly_donations_YYYY_QX.csv`

- [ ] RSpec tests (6 new tests):
  - Service: Generates report for Q1 2025
  - Service: Aggregates donations by donor correctly
  - Service: Calculates gross amount correctly
  - Service: Calculates net amount (after fees) correctly
  - Service: Includes monthly breakdown
  - Controller: Returns CSV with correct headers

#### Frontend Changes
- [ ] Update ReportsPage (TICKET-103):
  - Enable "Quarterly" tab
  - Add quarter selector (Q1, Q2, Q3, Q4)
  - Add year selector
  - Download CSV button

- [ ] Jest tests (3 new tests):
  - Quarterly tab renders quarter selector
  - Quarter selector updates state
  - Download button triggers API call

- [ ] Cypress E2E test (1 scenario):
  - Select Q1 2025 → download → verify CSV file

### Technical Implementation

#### Backend Service
```ruby
# app/services/donation_report_service.rb (UPDATE)
class DonationReportService
  # ... existing monthly report method ...

  def self.generate_quarterly_report(quarter:, year:, filters: {})
    # Validate quarter (1-4)
    unless (1..4).include?(quarter)
      raise ArgumentError, 'Quarter must be 1, 2, 3, or 4'
    end

    # Get start/end dates for quarter
    start_month = (quarter - 1) * 3 + 1
    start_date = Date.new(year, start_month, 1)
    end_date = start_date + 3.months - 1.day

    # Get all donations for quarter
    donations = Donation
      .includes(:donor, :project)
      .where(date: start_date..end_date)

    # Apply optional filters
    donations = donations.where(donor_id: filters[:donor_id]) if filters[:donor_id].present?

    # Group by donor
    donations_by_donor = donations.group_by(&:donor_id)

    # Generate CSV
    generate_quarterly_csv(donations_by_donor, start_date, end_date, quarter, year)
  end

  private

  def self.generate_quarterly_csv(donations_by_donor, start_date, end_date, quarter, year)
    CSV.generate(headers: true) do |csv|
      # Headers (with monthly breakdown)
      month_names = (0..2).map { |i| (start_date + i.months).strftime('%B') }

      csv << [
        'Donor Name',
        'Address',
        'Email',
        "#{month_names[0]} Given",
        "#{month_names[0]} Received",
        "#{month_names[1]} Given",
        "#{month_names[1]} Received",
        "#{month_names[2]} Given",
        "#{month_names[2]} Received",
        'Quarter Total Given',
        'Quarter Total Received',
        'Year Total Given',
        'Year Total Received',
        'All-Time Total Given',
        'All-Time Total Received'
      ]

      # Sort by donor name
      sorted_donors = donations_by_donor.keys.map { |id| Donor.find(id) }.sort_by(&:name)

      sorted_donors.each do |donor|
        donations = donations_by_donor[donor.id]

        # Calculate monthly totals
        month_totals = (0..2).map do |i|
          month_start = start_date + i.months
          month_end = month_start.end_of_month

          month_donations = donations.select { |d| d.date >= month_start && d.date <= month_end }
          gross = month_donations.sum(&:amount)
          net = calculate_net_amount(month_donations)

          [gross, net]
        end

        # Calculate quarter totals
        quarter_gross = donations.sum(&:amount)
        quarter_net = calculate_net_amount(donations)

        # Calculate year totals
        year_donations = donor.donations.where(date: start_date.beginning_of_year..start_date.end_of_year)
        year_gross = year_donations.sum(&:amount)
        year_net = calculate_net_amount(year_donations)

        # Calculate all-time totals
        all_time_donations = donor.donations
        all_time_gross = all_time_donations.sum(&:amount)
        all_time_net = calculate_net_amount(all_time_donations)

        csv << [
          donor.name,
          donor.full_address&.gsub("\n", ', ') || 'N/A',
          donor.displayable_email || donor.email,
          format_currency(month_totals[0][0]),
          format_currency(month_totals[0][1]),
          format_currency(month_totals[1][0]),
          format_currency(month_totals[1][1]),
          format_currency(month_totals[2][0]),
          format_currency(month_totals[2][1]),
          format_currency(quarter_gross),
          format_currency(quarter_net),
          format_currency(year_gross),
          format_currency(year_net),
          format_currency(all_time_gross),
          format_currency(all_time_net)
        ]
      end
    end
  end

  # Calculate net amount after Stripe fees
  # Stripe fee: 2.9% + $0.30 per transaction
  def self.calculate_net_amount(donations)
    donations.reduce(0) do |total, donation|
      # Only apply fees to online donations
      if donation.payment_method == 'online'
        fee = (donation.amount * 0.029).round + 30  # 2.9% + 30 cents
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
def quarterly
  quarter = params[:quarter].to_i
  year = params[:year].to_i

  # Validation
  unless (1..4).include?(quarter) && (2000..2100).include?(year)
    render json: { error: 'Invalid quarter or year' }, status: :unprocessable_entity
    return
  end

  filters = { donor_id: params[:donor_id] }.compact

  csv_data = DonationReportService.generate_quarterly_report(
    quarter: quarter,
    year: year,
    filters: filters
  )

  send_data csv_data,
    filename: "quarterly_donations_#{year}_Q#{quarter}.csv",
    type: 'text/csv',
    disposition: 'attachment'
rescue ArgumentError => e
  render json: { error: e.message }, status: :unprocessable_entity
end
```

#### Frontend - ReportsPage Update
```tsx
// src/pages/ReportsPage.tsx (UPDATE)
const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const handleDownloadQuarterly = async () => {
    setLoading(true);
    try {
      const response = await downloadQuarterlyReport(quarter, year);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quarterly_donations_${year}_Q${quarter}.csv`);
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
        <Tab label="Annual" disabled />
      </Tabs>

      {/* Monthly Tab (existing) */}
      {activeTab === 0 && (
        // ... existing monthly code ...
      )}

      {/* Quarterly Tab (NEW) */}
      {activeTab === 1 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quarterly Donation Report
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Download a report showing donations consolidated by donor, with gross and net amounts (after Stripe fees).
          </Typography>

          {/* Quarter/Year Selector */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value={1}>Q1 (Jan-Mar)</MenuItem>
              <MenuItem value={2}>Q2 (Apr-Jun)</MenuItem>
              <MenuItem value={3}>Q3 (Jul-Sep)</MenuItem>
              <MenuItem value={4}>Q4 (Oct-Dec)</MenuItem>
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

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadQuarterly}
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
export const downloadQuarterlyReport = (quarter: number, year: number) => {
  return apiClient.get('/api/reports/quarterly', {
    params: { quarter, year },
    responseType: 'blob'
  });
};
```

### CSV Report Format

**Example: quarterly_donations_2025_Q1.csv**
```csv
Donor Name,Address,Email,January Given,January Received,February Given,February Received,March Given,March Received,Quarter Total Given,Quarter Total Received,Year Total Given,Year Total Received,All-Time Total Given,All-Time Total Received
John Doe,"123 Main St, San Francisco CA 94102",john@example.com,100.00,96.80,100.00,96.80,100.00,96.80,300.00,290.40,3000.00,2904.00,6000.00,5808.00
Jane Smith,"456 Oak Ave, Portland OR 97201",jane@example.com,50.00,48.08,50.00,48.08,0.00,0.00,100.00,96.16,1200.00,1161.92,2400.00,2323.84
Bob Johnson,"",bob@example.com,25.00,24.04,25.00,24.04,25.00,24.04,75.00,72.12,900.00,868.44,1800.00,1736.88
```

**Columns Explained:**
- **Donor Name/Address/Email:** Donor details
- **[Month] Given:** Total amount donated in that month
- **[Month] Received:** Net amount after Stripe fees (2.9% + $0.30/transaction)
- **Quarter Total Given:** Total donated in quarter
- **Quarter Total Received:** Net after fees for quarter
- **Year Total Given/Received:** Year-to-date totals
- **All-Time Total Given/Received:** Lifetime totals

**Stripe Fee Calculation Example:**
- Donation: $100.00
- Stripe fee: ($100.00 × 2.9%) + $0.30 = $2.90 + $0.30 = $3.20
- Net received: $100.00 - $3.20 = $96.80

### UX Design

**Reports Page - Quarterly Tab:**
```
┌─────────────────────────────────────────┐
│  Reports                                │
├─────────────────────────────────────────┤
│  [Monthly] [Quarterly] [Annual]         │
├─────────────────────────────────────────┤
│                                         │
│  Quarterly Donation Report              │
│  Download a report showing donations    │
│  consolidated by donor, with gross and  │
│  net amounts (after Stripe fees).       │
│                                         │
│  [Q1 (Jan-Mar)  ▼]  [2025  ▼]          │
│                                         │
│  [⬇ Download CSV]                      │
│                                         │
└─────────────────────────────────────────┘
```

### Files to Modify

**Backend:**
- `app/services/donation_report_service.rb` (add quarterly method, +100 lines)
- `app/controllers/api/reports_controller.rb` (add quarterly action, +20 lines)
- `spec/services/donation_report_service_spec.rb` (add 6 tests)
- `spec/requests/api/reports_spec.rb` (add 3 tests)

**Frontend:**
- `src/pages/ReportsPage.tsx` (add quarterly tab, +60 lines)
- `src/api/client.ts` (add downloadQuarterlyReport method)
- `src/pages/ReportsPage.test.tsx` (add 3 tests)
- `cypress/e2e/reports.cy.ts` (add 1 test)

### Testing Strategy

**Backend RSpec (6 tests):**
1. Service generates report for Q1 2025
2. Service aggregates donations by donor (one row per donor)
3. Service calculates gross amount correctly
4. Service calculates net amount (after Stripe fees) correctly
5. Service includes monthly breakdown (Jan/Feb/Mar for Q1)
6. Controller returns CSV with correct headers

**Frontend Jest (3 tests):**
1. Quarterly tab renders quarter selector
2. Quarter selector updates state
3. Download button triggers API call with correct quarter/year

**Cypress E2E (1 test):**
1. Navigate to Reports → Quarterly tab → select Q1 2025 → download → verify CSV

### Stripe Fee Considerations

**Fee Structure:**
- **Online donations:** 2.9% + $0.30 per transaction
- **Check/cash donations:** No Stripe fees (received in full)

**Accuracy:**
- Actual Stripe fees may vary (international cards, currency conversion)
- This is an *estimate* for reporting purposes
- For exact amounts, reconcile with Stripe dashboard

**Future Enhancement:**
- Store actual Stripe fee from webhook (TICKET-012)
- Use real fee data instead of calculation
- Add disclaimer in report: "Estimated fees"

### Performance Considerations

**Optimization:**
- Use `includes(:donor, :donations)` to avoid N+1 queries
- Consider caching quarterly reports (stale after 24 hours)
- For large datasets (>1000 donors), add pagination or background job

### Estimated Time
- Backend service method: 2.5 hours
- Backend controller + routes: 1 hour
- Backend tests: 1.5 hours
- Frontend quarterly tab: 1.5 hours
- Frontend tests: 1 hour
- E2E test: 30 minutes
- **Total:** 8 hours

### Success Criteria
- [ ] Quarterly report generates CSV with one row per donor
- [ ] Includes monthly breakdown (3 months per quarter)
- [ ] Shows gross amount given and net amount received (after fees)
- [ ] Calculates year total and all-time total per donor
- [ ] CSV downloads with proper filename
- [ ] All tests passing (RSpec + Jest + Cypress)

### Related Tickets
- TICKET-100: Add Physical Address to Donor Records ✅ (required for address in report)
- TICKET-103: Monthly Donation Report ✅ (ReportsPage foundation)
- TICKET-105: Annual Donation Report (same page, different tab)
- TICKET-012: Stripe Webhook Integration (future: use real fee data)

### Notes
- **Tax Receipts:** Quarterly reports help generate donor tax receipts
- **Gross vs Net:** Shows organization's actual revenue after payment processing
- **Donor Engagement:** One-row-per-donor format reveals giving patterns
- **Future Enhancement:** Add donor engagement score (frequency, recency, amount)
- **Future Enhancement:** Add donor retention analysis
- **Excel Compatibility:** CSV opens in Excel, Google Sheets for further analysis
