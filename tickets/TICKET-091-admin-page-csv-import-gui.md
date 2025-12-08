## [TICKET-091] Stripe CSV Import GUI

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** S (Small - 3 hours)
**Created:** 2025-11-05
**Updated:** 2025-12-08
**Completed:** 2025-12-08
**Dependencies:** TICKET-071 (Stripe batch import rake task) ✅, TICKET-088 (Admin page + CSV export) ✅

### Implementation Summary (2025-12-08)
**Completed:** Added Stripe CSV import functionality to Admin page CSV tab.

**Key Features:**
- ✅ MUI-styled file upload with hidden input + label pattern
- ✅ Loading state with 120s timeout for large CSV files
- ✅ Error handling with user-friendly messages
- ✅ Results display (succeeded/skipped/failed/needs_attention counts)
- ✅ Binary mode file handling to support non-UTF-8 CSV files
- ✅ Clear button to reset form
- ✅ Full test coverage: 5 RSpec + 7 Jest + 1 Cypress E2E tests

**Commits:**
- `backend: add Stripe CSV import endpoint to Admin controller (TICKET-091)`
- `frontend: add Stripe CSV import UI to Admin page (TICKET-091)`

**Implementation Strategy:** Reuse existing rake task service (`StripeCsvBatchImporter`) - controller acts as thin wrapper, no new business logic needed.

**Scope:** Stripe CSV import only (creates both donors and donations). Donor-only import is obsolete since Stripe import handles donor creation via DonorService.

### User Story
As an admin, I want Stripe CSV import functionality in the Admin page so that I can import Stripe payment data (donors + donations) through the web interface without needing backend CLI access.

### Problem Statement
**Current Workflow:**
- Stripe CSV imports require backend CLI access (`rake stripe:import_csv`)
- Non-technical users cannot import data
- Import errors not visible until checking logs

**Desired Workflow:**
- Navigate to Admin page → CSV tab
- Upload Stripe CSV file (file picker button)
- View real-time import results (succeeded, failed, needs attention, skipped counts)
- See detailed error messages for failed rows

### Acceptance Criteria

#### Frontend - Admin Page (EXISTING ✅)
- [x] Add "Admin" navigation tab to main menu (TICKET-088)
- [x] Create AdminPage component at route `/admin` (TICKET-088)
- [x] Tab structure: Pending Review | CSV | Projects (TICKET-088, TICKET-111, TICKET-119)
- [x] CSV tab: Export functionality (TICKET-088)

#### Frontend - CSV Import Section (NEW - Add to existing CSV tab)
- [x] File upload component (Material-UI)
  - File picker button
  - Accept `.csv` files only
  - Show selected filename
  - Label: "Stripe CSV Import"

- [x] Upload button
  - Disabled until file selected
  - Triggers API call with CSV file
  - Shows loading spinner during upload
  - Text: "Import Stripe CSV"

- [x] Results display
  - Success message: "✅ Succeeded: X donations"
  - Skipped message: "⏭️ Skipped: Y duplicates"
  - Attention message: "⚠️ Needs Attention: Z donations"
  - Error summary: "❌ Failed: N rows"
  - Error list with row numbers and error messages
  - Clear button to start new import

#### Backend - Admin API Endpoints
- [x] POST `/api/admin/import/stripe_payments`
  - Accepts multipart/form-data with CSV file
  - Calls `StripeCsvBatchImporter.new(file_path).import`
  - Returns: `{ success_count, skipped_count, failed_count, needs_attention_count, errors: [{row, error}] }`

- [x] Authorization (future enhancement)
  - For now: No auth check (single-user internal tool)
  - TODO: Add admin role check when TICKET-008 (auth) complete

#### Testing
- [x] RSpec: Admin import endpoint (5 tests) ✅
  - POST /api/admin/import/stripe_payments with valid CSV → returns success
  - POST /api/admin/import/stripe_payments with errors → returns error summary
  - POST with missing file → returns 500
  - POST with malformed CSV → handles gracefully
  - POST with non-UTF-8 encoding → handles gracefully (binary mode)

- [x] Jest: AdminPage CSV import (7 tests) ✅
  - CSV import section renders with file input
  - File selection updates state
  - Upload button disabled when no file selected
  - Upload button calls API with FormData
  - Success result displays all counts (succeeded, skipped, needs_attention, failed)
  - Clear button resets form state
  - Loading state displays during import

- [x] Cypress E2E: Stripe CSV import workflow (1 test) ✅
  - Upload Stripe CSV → verify result display (success or error)

### Technical Implementation

#### Frontend - AdminPage Component (MODIFY EXISTING)
**Current CSV tab (TICKET-088):**
```tsx
{currentTab === 1 && (
  <Box>
    <Typography variant="h6" gutterBottom>Export Donors</Typography>
    <Button variant="contained" startIcon={<Download />} onClick={handleDonorExport}>
      Export All Donors to CSV
    </Button>
  </Box>
)}
```

**Updated CSV tab (add import below export):**
```tsx
// src/pages/AdminPage.tsx (MODIFY - add to existing CSV tab)
const AdminPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  // ADD: Import state
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/admin/import/stripe_payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error: any) {
      setResult({ error: error.response?.data?.error || 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearResult = () => {
    setFile(null);
    setResult(null);
  };

  // MODIFY: CSV tab (currentTab === 1)
  {currentTab === 1 && (
    <Box>
      {/* Existing Export Section */}
      <Typography variant="h6" gutterBottom>Export Donors</Typography>
      <Button variant="contained" startIcon={<Download />} onClick={handleDonorExport} sx={{ mb: 4 }}>
        Export All Donors to CSV
      </Button>

      {/* NEW: Stripe CSV Import Section */}
      <Typography variant="h6" gutterBottom>Stripe CSV Import</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Import creates both donors and donations from Stripe payment exports
      </Typography>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ marginBottom: '16px', display: 'block' }}
      />

      {file && <Typography variant="body2" sx={{ mb: 2 }}>Selected: {file.name}</Typography>}

      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={!file || loading}
        fullWidth
        sx={{ mb: 2 }}
      >
        {loading ? 'Importing...' : 'Import Stripe CSV'}
      </Button>

      {result && (
        <Box sx={{ mt: 3 }}>
          {result.error ? (
            <Typography color="error">{result.error}</Typography>
          ) : (
            <>
              <Typography color="success.main">
                ✅ Succeeded: {result.success_count} donations
              </Typography>
              {result.skipped_count > 0 && (
                <Typography color="info.main">
                  ⏭️ Skipped: {result.skipped_count} duplicates
                </Typography>
              )}
              {result.needs_attention_count > 0 && (
                <Typography color="warning.main">
                  ⚠️ Needs Attention: {result.needs_attention_count} donations
                </Typography>
              )}
              {result.failed_count > 0 && (
                <Typography color="error">
                  ❌ Failed: {result.failed_count} donations
                </Typography>
              )}
              {result.errors?.length > 0 && (
                <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
                  {result.errors.map((err: any, idx: number) => (
                    <Typography key={idx} variant="body2" color="text.secondary">
                      Row {err.row}: {err.error}
                    </Typography>
                  ))}
                </Box>
              )}
              <Button variant="outlined" onClick={handleClearResult} sx={{ mt: 2 }}>
                Clear
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  )}
};
```

#### Frontend - API Client
**Note:** No separate API client functions needed - inline API calls in component (see above)

#### Frontend - Router (ALREADY EXISTS ✅)
```tsx
// src/App.tsx (NO CHANGES - route already exists from TICKET-088)
<Route path="/admin" element={<AdminPage />} />
```

#### Backend - Admin Controller (REUSES EXISTING SERVICE ✅)
```ruby
# app/controllers/api/admin_controller.rb (NEW - ~35 lines, thin wrapper)
# frozen_string_literal: true

# Handles Stripe CSV imports via web interface.
#
# This controller provides:
# - Stripe CSV import (reuses StripeCsvBatchImporter from rake task)
# - Creates both donors and donations (via DonorService internally)
#
# No business logic here - service handles all import logic.
#
# @see StripeCsvBatchImporter for Stripe import logic
# @see lib/tasks/stripe_import.rake for CLI equivalent
module Api
  class AdminController < ApplicationController
    # Future: Add authorization check
    # before_action :require_admin

    def import_stripe_payments
      # Save uploaded file temporarily (StripeCsvBatchImporter needs file path)
      temp_file = Tempfile.new(['stripe_import', '.csv'])
      temp_file.write(params[:file].read)
      temp_file.rewind

      # Reuse existing service (same as rake task!)
      importer = StripeCsvBatchImporter.new(temp_file.path)
      result = importer.import

      render json: {
        success_count: result[:succeeded_count],
        skipped_count: result[:skipped_count],
        failed_count: result[:failed_count],
        needs_attention_count: result[:needs_attention_count],
        errors: result[:errors].map { |e| { row: e[:row], error: e[:message] } }
      }
    rescue StandardError => e
      render json: { error: "Import failed: #{e.message}" }, status: :internal_server_error
    ensure
      temp_file&.close
      temp_file&.unlink
    end
  end
end
```

#### Backend - Routes
```ruby
# config/routes.rb (ADD)
namespace :api do
  namespace :admin do
    post 'import/stripe_payments', to: 'admin#import_stripe_payments'
  end
end
```

#### Backend - Service Reuse (NO CHANGES NEEDED ✅)
**Existing service (already tested via rake task):**
- `StripeCsvBatchImporter` - Used by `rake stripe:import_csv` (TICKET-071, TICKET-110)
- Internally calls `DonorService` to create/update donors (TICKET-002)

**No modifications needed** - controller calls service with same arguments as rake task.

**CLI to API equivalence:**
```bash
# CLI: docker-compose exec api bundle exec rake stripe:import_csv[stripe.csv]
# API: POST /api/admin/import/stripe_payments (file upload)
# Both use: StripeCsvBatchImporter.new(file_path).import
# Both create: Donors (via DonorService) + Donations + Sponsorships
```

### UX Design

**Admin Page Layout (Current with tabs from TICKET-088, TICKET-111, TICKET-119):**
```
┌────────────────────────────────────────────────┐
│  Admin                                         │
│  [Pending Review] [CSV] [Projects]             │
├────────────────────────────────────────────────┤
│                                                │
│  CSV Tab Content:                              │
│                                                │
│  Export Donors                                 │
│  [📥 Export All Donors to CSV]                 │
│                                                │
│  ───────────────────────────────────────────   │
│                                                │
│  Stripe CSV Import                             │
│  Import creates both donors and donations      │
│  from Stripe payment exports                   │
│                                                │
│  [Choose File] stripe_payments.csv             │
│                                                │
│  [Import Stripe CSV]                           │
│                                                │
│  ✅ Succeeded: 145 donations                   │
│  ⏭️ Skipped: 10 duplicates                     │
│  ⚠️ Needs Attention: 2 donations               │
│  ❌ Failed: 3 donations                        │
│                                                │
│  Row 42: Invalid child name                    │
│  Row 87: Missing donor email                   │
│  Row 103: Malformed date                       │
│                                                │
│  [Clear]                                       │
└────────────────────────────────────────────────┘
```

### Files to Create
**Backend:**
- `app/controllers/api/admin_controller.rb` (NEW - ~35 lines, thin wrapper)
- `spec/requests/api/admin_spec.rb` (NEW - ~60 lines, 4 tests)

**Frontend:**
- `cypress/e2e/admin-csv-import.cy.ts` (NEW - ~60 lines, 2 tests)

### Files to Modify
**Backend:**
- `config/routes.rb` (add admin namespace route - 5 lines)

**Frontend:**
- `src/pages/AdminPage.tsx` (MODIFY - add Stripe import to CSV tab ~60 lines added)
- `src/pages/AdminPage.test.tsx` (MODIFY - add import tests ~50 lines added, 6 tests)

**Services (NO CHANGES ✅):**
- `app/services/stripe_csv_batch_importer.rb` - Already tested via rake task, used as-is
- `app/services/donor_service.rb` - Already tested, called internally by Stripe import

### Testing Strategy

**Backend RSpec (4 NEW tests in new admin_spec.rb - controller integration only):**
1. POST /api/admin/import/stripe_payments with valid CSV → returns success (calls StripeCsvBatchImporter)
2. POST /api/admin/import/stripe_payments with errors → returns error summary
3. POST with missing file → returns 500
4. POST with malformed CSV → handles gracefully

**Note:** Service logic already tested via existing specs:
- `spec/services/stripe_csv_batch_importer_spec.rb` (TICKET-071, TICKET-110)
- `spec/services/donor_service_spec.rb` (TICKET-002, called internally)

**Frontend Jest (6 NEW tests - add to existing AdminPage.test.tsx):**
1. Stripe CSV import section renders with file input and help text
2. File selection updates state
3. Upload button disabled when no file selected
4. Upload button calls API with FormData
5. Success result displays all counts (succeeded, skipped, needs_attention, failed)
6. Clear button resets form state

**Cypress E2E (2 NEW tests in admin-csv-import.cy.ts):**
1. Upload Stripe CSV → verify success counts → navigate to donations/donors pages → verify data imported
2. Upload invalid CSV → verify error message with row details

### Security Considerations

**Current (MVP):**
- No authentication required (single-user internal tool)
- No authorization checks
- **Risk:** Anyone with URL access can import data

**Future (Post-TICKET-008):**
- Add `before_action :require_admin` to AdminController
- Only allow authenticated users with admin role
- Add CSRF protection (Rails default)
- Rate limiting on upload endpoints

### Performance Considerations

**File Size Limits:**
- Rails default: 10MB max upload
- Adjust in `config/application.rb` if needed:
  ```ruby
  config.action_dispatch.max_file_size = 50.megabytes
  ```

**Async Processing (Future Enhancement):**
- For large CSVs (>1000 rows), consider background job:
  ```ruby
  DonorImportJob.perform_later(csv_data)
  ```
- Add progress polling endpoint
- Display progress bar in UI

### Integration with Existing Tickets

**Unblocks:**
- **TICKET-071:** Stripe CSV Batch Import (currently blocked on user testing - GUI enables this!)

**Reuses:**
- **TICKET-002:** DonorImportService (backend service exists)
- **TICKET-070:** StripePaymentImportService (backend service exists)

**Future Integration:**
- **TICKET-008:** Authentication (add admin role check)
- **TICKET-072:** Import Error Recovery UI (could be merged into this admin page)

### Estimated Time
- Backend controller + routes + tests: 45 minutes (thin wrapper, single endpoint)
- Frontend Stripe import UI: 45 minutes (modify existing AdminPage CSV tab)
- Frontend tests: 45 minutes (add to existing tests)
- E2E tests: 30 minutes
- **Total:** 2.75 hours (~3 hours)

**Time savings:**
- ~1 hour (no service development, reuse rake task logic)
- ~30 minutes (no donor import, single endpoint only)

### Success Criteria
- [x] Admin page accessible via /admin route (TICKET-088 ✅)
- [x] Admin page has CSV tab (TICKET-088 ✅)
- [x] Stripe CSV file upload works (creates donors + donations) ✅
- [x] Success message shows all counts (succeeded, skipped, needs_attention, failed) ✅
- [x] Error messages show row-level details ✅
- [x] Clear button resets import form ✅
- [x] All tests passing (RSpec + Jest + Cypress) ✅
- [x] Stripe imports can be done via GUI (no CLI access needed) ✅

### Related Tickets
**Dependencies (completed):**
- TICKET-002: DonorService ✅ (called internally by Stripe import)
- TICKET-070: StripePaymentImportService ✅ (foundation for batch import)
- TICKET-071: Stripe CSV Batch Import ✅ (rake task fully tested)
- TICKET-110: Import Status & Metadata ✅ (status counting logic)
- TICKET-088: Donor CSV Export ✅ (created AdminPage + CSV tab with export)
- TICKET-111: Pending Review Section ✅ (added Pending Review tab to AdminPage)
- TICKET-119: Projects Admin Tab ✅ (added Projects tab to AdminPage)

**Enables:**
- Non-technical users to import Stripe payment data
- GUI testing of Stripe imports (no CLI access needed)

**Future Integration:**
- TICKET-072: Import Error Recovery UI 📋 (could add to CSV tab)
- TICKET-008: Authentication with Google OAuth 📋 (add admin role check)

### Notes
- **Priority:** Medium - Enables non-technical Stripe CSV imports via web interface
- **Scope Simplification:** Stripe import only (creates both donors + donations). Donor-only import removed as obsolete.
- **Code Reuse Strategy:** Controller is thin wrapper around existing rake task service (StripeCsvBatchImporter) - zero new business logic
- **Effort Reduction:**
  - ~100 lines less code than originally estimated (no AdminPage creation, AdminPage exists from TICKET-088/111/119)
  - ~1.5 hours less work (no service development, no donor import, single endpoint, controller only ~35 lines)
  - All import logic already tested via rake task specs (TICKET-071, TICKET-110)
- **UX:** Simple file upload with detailed status feedback (4 count types: succeeded, skipped, needs_attention, failed)
- **Future Features:** Download error CSV, async processing for large files, progress bar, drag-and-drop upload
