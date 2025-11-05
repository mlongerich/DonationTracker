## [TICKET-087] Donor Bulk Operations (Archive, Restore, Export)

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-05
**Source:** BACKLOG.md
**Dependencies:** TICKET-001 (Donor soft delete) ✅

### User Story
As a user, I want to perform bulk actions on multiple donors (archive, restore, export) so that I can efficiently manage large sets of donors without individual operations.

### Acceptance Criteria
- [ ] Add checkboxes to DonorList for multi-select
- [ ] Add bulk action toolbar (Archive, Restore, Export buttons)
- [ ] Backend endpoint: POST `/api/donors/bulk_archive` (accepts donor_ids array)
- [ ] Backend endpoint: POST `/api/donors/bulk_restore` (accepts donor_ids array)
- [ ] Export generates CSV with selected donors
- [ ] Confirmation dialog before bulk operations
- [ ] Success message shows count: "Archived 5 donors"
- [ ] Tests: RSpec (bulk endpoints), Jest (checkbox selection), Cypress (full workflow)

### Technical Approach
**Backend:**
```ruby
# app/controllers/api/donors_controller.rb
def bulk_archive
  donor_ids = params[:donor_ids]
  donors = Donor.where(id: donor_ids)
  donors.each(&:discard)
  render json: { archived_count: donors.count }
end

def bulk_restore
  donor_ids = params[:donor_ids]
  donors = Donor.discarded.where(id: donor_ids)
  donors.each(&:undiscard)
  render json: { restored_count: donors.count }
end
```

**Frontend:**
```tsx
const [selectedDonorIds, setSelectedDonorIds] = useState<number[]>([]);

// Checkbox in row
<Checkbox
  checked={selectedDonorIds.includes(donor.id)}
  onChange={() => toggleSelection(donor.id)}
/>

// Bulk toolbar (only show when selections exist)
{selectedDonorIds.length > 0 && (
  <Box>
    <Button onClick={handleBulkArchive}>Archive ({selectedDonorIds.length})</Button>
    <Button onClick={handleBulkRestore}>Restore</Button>
    <Button onClick={handleExport}>Export CSV</Button>
  </Box>
)}
```

### Files to Modify
**Backend:** donors_controller.rb (add 2 actions), routes.rb, spec/requests/api/donors_spec.rb (6 tests)
**Frontend:** DonorList.tsx (+100 lines), DonorsPage.tsx (+50 lines), tests (+20 lines)
**Cypress:** donor-bulk-operations.cy.ts (NEW, 4 tests)

### Estimated Time: 3-4 hours
