## [TICKET-088] Donor Export to CSV

**Status:** ✅ Complete
**Priority:** 🟢 Low
**Effort:** S (Small - 2-3 hours)
**Created:** 2025-11-05
**Updated:** 2025-12-03
**Completed:** 2025-12-03
**Source:** BACKLOG.md
**Dependencies:** ✅ TICKET-100 (Phone + Address fields) - COMPLETE

### User Story
As a user, I want to export the donor list to CSV/Excel format so that I can analyze data in spreadsheet tools and create backups.

### Acceptance Criteria
- [x] Add "Export All Donors to CSV" button to Admin page CSV tab (with Download icon)
- [x] Export exports all active donors (include_discarded=false)
- [x] CSV includes: Name, Email (hidden if @mailinator.com), Phone, Address Line 1, Address Line 2, City, State, Zip, Country, Total Donated, Donation Count, Last Donation Date, Status
- [x] File downloads as `donors_export_YYYYMMDD.csv`
- [x] Backend generates CSV using Ruby CSV library with proper YARD documentation
- [x] Backend uses SQL aggregates to avoid N+1 queries (total_donated, donation_count, last_donation_date)
- [x] Tests: RSpec (5 service tests, 2 controller tests), Jest (2 AdminPage tests), Cypress (Admin page download flow)

### Technical Approach
**Backend:**
```ruby
# frozen_string_literal: true

require "csv"

# Generates CSV export of donor list with contact info and donation aggregates.
#
# This service provides:
# - CSV export with phone, address, and donation statistics
# - Efficient SQL aggregates (avoids N+1 queries)
# - Currency formatting (cents → dollars)
# - Status column (Active/Archived)
#
# Uses class method pattern for stateless CSV generation.
#
# @example Generate CSV for filtered donors
#   donors = Donor.kept.where("name LIKE ?", "%John%")
#   csv_data = DonorExportService.generate_csv(donors)
#   send_data csv_data, filename: "donors_export_#{Date.today.strftime('%Y%m%d')}.csv"
#
# @see DonorsController#export for controller usage
# @see TICKET-088 for implementation details
class DonorExportService
  HEADERS = [
    'Name',
    'Email',
    'Phone',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'Zip',
    'Country',
    'Total Donated',
    'Donation Count',
    'Status'
  ].freeze

  def self.generate_csv(donors_scope)
    # Preload aggregates to avoid N+1 queries
    donors_with_stats = donors_scope
      .left_joins(:donations)
      .group('donors.id')
      .select(
        'donors.*',
        'COALESCE(SUM(donations.amount), 0) as total_donated_cents',
        'COUNT(donations.id) as donation_count'
      )

    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      donors_with_stats.each do |donor|
        csv << [
          donor.name,
          donor.email,
          donor.phone || '',
          donor.address_line1 || '',
          donor.address_line2 || '',
          donor.city || '',
          donor.state || '',
          donor.zip_code || '',
          donor.country || '',
          format_currency(donor.total_donated_cents.to_i),
          donor.donation_count.to_i,
          donor.discarded? ? 'Archived' : 'Active'
        ]
      end
    end
  end

  def self.format_currency(cents)
    "$#{'%.2f' % (cents / 100.0)}"
  end
  private_class_method :format_currency
end

# app/controllers/api/donors_controller.rb (ADD export action)
def export
  scope = params[:include_discarded] == "true" ? Donor.with_discarded : Donor.kept
  scope = scope.where(merged_into_id: nil)
  filtered_scope = apply_ransack_filters(scope)

  csv_data = DonorExportService.generate_csv(filtered_scope)

  send_data csv_data,
    filename: "donors_export_#{Date.today.strftime('%Y%m%d')}.csv",
    type: 'text/csv'
end
```

**Routes:**
```ruby
# config/routes.rb
resources :donors, only: [:create, :show, :index, :update, :destroy] do
  delete "all", action: :destroy_all, on: :collection
  post "merge", action: :merge, on: :collection
  get "export", action: :export, on: :collection  # NEW
  post "restore", action: :restore, on: :member
end
```

**Frontend:**
```tsx
// src/pages/DonorsPage.tsx (ADD export handler and button)
import Download from '@mui/icons-material/Download';

// Inside DonorsPage component:
const handleExport = async () => {
  try {
    const params: Record<string, unknown> = {
      include_discarded: showArchived,
    };

    if (debouncedQuery.trim()) {
      params.q = { name_or_email_cont: debouncedQuery };
    }

    const response = await apiClient.get('/api/donors/export', {
      params,
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.setAttribute('download', `donors_export_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    setError('Failed to export donors');
  }
};

// Add button below search field (before DonorList)
<Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
  <FormControlLabel
    control={
      <Checkbox
        checked={showArchived}
        onChange={(e) => setShowArchived(e.target.checked)}
      />
    }
    label="Show Archived Donors"
  />
  <Button
    variant="outlined"
    startIcon={<Download />}
    onClick={handleExport}
    size="small"
  >
    Export CSV
  </Button>
</Box>
```

### Files to Create
- `app/services/donor_export_service.rb` (NEW)
- `spec/services/donor_export_service_spec.rb` (NEW, 3 tests)

### Files to Modify
- `app/controllers/api/donors_controller.rb` (add export action, ~10 lines)
- `config/routes.rb` (add export route, 1 line)
- `src/pages/DonorsPage.tsx` (add export handler and button, ~30 lines)
- `spec/requests/api/donors_spec.rb` (add 2 export tests)

### Testing Details

**Backend RSpec (5 tests total):**

**Service Tests (3 tests):**
1. `DonorExportService.generate_csv` with empty donor list → returns CSV with headers only
2. `DonorExportService.generate_csv` with single donor (no donations) → returns correct CSV row with $0.00 total
3. `DonorExportService.generate_csv` with multiple donors (with donations) → returns correct aggregates (total_donated, donation_count)

**Controller Tests (2 tests):**
1. `GET /api/donors/export` respects filters (search query) → returns filtered CSV
2. `GET /api/donors/export` respects include_discarded param → includes archived donors in CSV

**Frontend Jest (1 test):**
1. DonorsPage renders "Export CSV" button

**Cypress E2E (1 test):**
1. User clicks "Export CSV" button → file downloads with correct filename format

### Estimated Time: 2-3 hours
- Backend service + controller: 1 hour
- Backend tests: 1 hour
- Frontend button + handler: 30 minutes
- E2E test: 30 minutes

### Notes
- **Dependency:** TICKET-100 must be completed first (adds phone + address fields to Donor model)
- If TICKET-087 implemented later, export can add bulk selection feature (export only selected donors)
- CSV format chosen over Excel for simplicity (can add XLSX later with gem like `caxlsx`)
- SQL aggregates avoid N+1 queries (efficient for large donor lists)
- Future enhancements:
  - Add pagination/streaming for very large exports (>10,000 donors)
  - Add Excel (.xlsx) format option
  - Add column customization (choose which fields to include)
