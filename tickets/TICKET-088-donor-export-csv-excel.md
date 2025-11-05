## [TICKET-088] Donor Export to CSV/Excel

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-05
**Source:** BACKLOG.md
**Dependencies:** None (or subset of TICKET-087 if bulk operations implemented)

### User Story
As a user, I want to export the donor list to CSV/Excel format so that I can analyze data in spreadsheet tools and create backups.

### Acceptance Criteria
- [ ] Add "Export" button to Donors page
- [ ] Export respects current filters (search, show archived)
- [ ] CSV includes: name, email, phone, address, donation_count, total_donated, discarded_at
- [ ] File downloads as `donors_export_YYYYMMDD.csv`
- [ ] Backend generates CSV using Ruby CSV library
- [ ] Tests: RSpec (CSV generation), Jest (button click), Cypress (download)

### Technical Approach
**Backend:**
```ruby
# app/controllers/api/donors_controller.rb
def export
  donors = apply_ransack_filters(Donor.all)
  csv_data = DonorExportService.generate_csv(donors)

  send_data csv_data,
    filename: "donors_export_#{Date.today}.csv",
    type: 'text/csv'
end

# app/services/donor_export_service.rb
class DonorExportService
  def self.generate_csv(donors)
    CSV.generate(headers: true) do |csv|
      csv << ['Name', 'Email', 'Phone', 'Total Donated', 'Status']
      donors.each do |donor|
        csv << [
          donor.name,
          donor.displayable_email,
          donor.phone,
          donor.donations.sum(:amount) / 100.0,
          donor.discarded? ? 'Archived' : 'Active'
        ]
      end
    end
  end
end
```

**Frontend:**
```tsx
const handleExport = async () => {
  const response = await apiClient.get('/api/donors/export', {
    params: { q: ransackFilters },
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `donors_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

<Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
  Export CSV
</Button>
```

### Files to Create
- `app/services/donor_export_service.rb` (NEW)
- `spec/services/donor_export_service_spec.rb` (NEW, 3 tests)

### Files to Modify
- `app/controllers/api/donors_controller.rb` (add export action)
- `config/routes.rb` (add export route)
- `src/pages/DonorsPage.tsx` (add export button)
- `spec/requests/api/donors_spec.rb` (add 2 export tests)

### Estimated Time: 1-2 hours

### Notes
- If TICKET-087 implemented, export can reuse bulk selection logic
- CSV format chosen over Excel for simplicity (can add XLSX later)
- Future: Add pagination for large exports (stream CSV)
