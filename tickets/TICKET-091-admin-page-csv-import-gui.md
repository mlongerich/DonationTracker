## [TICKET-091] Admin Page with CSV Import GUI

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-05
**Dependencies:** TICKET-002 (Donor import service) ✅, TICKET-070 (Stripe import service) ✅

### User Story
As an admin, I want a dedicated Admin page with CSV import functionality so that I can import donor and Stripe payment data through the web interface without needing backend CLI access.

### Problem Statement
**Current Workflow:**
- CSV imports require backend CLI access (rake tasks)
- Non-technical users cannot import data
- Difficult to test TICKET-071 (Stripe batch import) without GUI
- Import errors not visible until checking logs

**Desired Workflow:**
- Navigate to Admin page in web interface
- Upload CSV file (drag-and-drop or button)
- Select import type (Donors or Stripe Payments)
- View real-time progress and results
- See detailed error messages for failed rows

### Acceptance Criteria

#### Frontend - Admin Page
- [ ] Add "Admin" navigation tab to main menu
- [ ] Create AdminPage component at route `/admin`
- [ ] Material-UI layout with sections for admin tools
- [ ] Future-ready: Placeholder for additional admin features

#### Frontend - CSV Import Section
- [ ] File upload component (Material-UI)
  - Drag-and-drop zone OR file picker button
  - Accept `.csv` files only
  - Show selected filename

- [ ] Import type selector
  - Dropdown/radio: "Donor Import" or "Stripe Payment Import"
  - Default: Donor Import

- [ ] Upload button
  - Disabled until file selected
  - Triggers API call with CSV file
  - Shows loading spinner during upload

- [ ] Results display
  - Success message: "Imported 45 donors successfully"
  - Error summary: "3 rows failed to import"
  - Expandable error table with row numbers and error messages
  - Download errors as CSV button (optional)

#### Backend - Admin API Endpoints
- [ ] POST `/api/admin/import/donors`
  - Accepts multipart/form-data with CSV file
  - Calls `DonorImportService.import_csv(csv_data)`
  - Returns: `{ success_count, error_count, errors: [{row, email, error}] }`

- [ ] POST `/api/admin/import/stripe_payments`
  - Accepts multipart/form-data with CSV file
  - Calls `StripePaymentImportService.import_batch(csv_data)`
  - Returns: `{ success_count, error_count, skipped_count, errors: [{row, invoice_id, error}] }`

- [ ] Authorization (future enhancement)
  - For now: No auth check (single-user internal tool)
  - TODO: Add admin role check when TICKET-008 (auth) complete

#### Testing
- [ ] RSpec: Admin import endpoints (6 tests)
  - POST /api/admin/import/donors with valid CSV
  - POST /api/admin/import/donors with invalid CSV
  - POST /api/admin/import/stripe_payments with valid CSV
  - POST with missing file
  - POST with non-CSV file
  - POST with empty CSV

- [ ] Jest: AdminPage and CSV upload (8 tests)
  - AdminPage renders
  - File upload component renders
  - Import type selector renders
  - File selection updates state
  - Upload button triggers API call
  - Results display shows success/error counts
  - Error table displays error rows

- [ ] Cypress E2E: Full CSV import workflow (2 tests)
  - Upload donor CSV → verify success message → verify donors in list
  - Upload invalid CSV → verify error message displayed

### Technical Implementation

#### Frontend - AdminPage Component
```tsx
// src/pages/AdminPage.tsx (NEW)
import { useState } from 'react';
import { Box, Typography, Paper, Button, Select, MenuItem } from '@mui/material';
import { uploadDonorCSV, uploadStripePaymentCSV } from '../api/client';

const AdminPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'donors' | 'stripe'>('donors');
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

      const response = importType === 'donors'
        ? await uploadDonorCSV(formData)
        : await uploadStripePaymentCSV(formData);

      setResult(response.data);
    } catch (error: any) {
      setResult({ error: error.response?.data?.error || 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Tools
      </Typography>

      {/* CSV Import Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          CSV Import
        </Typography>

        {/* Import Type Selector */}
        <Select
          value={importType}
          onChange={(e) => setImportType(e.target.value as 'donors' | 'stripe')}
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="donors">Donor Import</MenuItem>
          <MenuItem value="stripe">Stripe Payment Import</MenuItem>
        </Select>

        {/* File Upload */}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ marginBottom: '16px' }}
        />

        {file && <Typography variant="body2">Selected: {file.name}</Typography>}

        {/* Upload Button */}
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
          fullWidth
        >
          {loading ? 'Uploading...' : 'Upload CSV'}
        </Button>

        {/* Results Display */}
        {result && (
          <Box sx={{ mt: 3 }}>
            {result.error ? (
              <Typography color="error">{result.error}</Typography>
            ) : (
              <>
                <Typography color="success.main">
                  ✅ Imported {result.success_count} rows successfully
                </Typography>
                {result.error_count > 0 && (
                  <>
                    <Typography color="error">
                      ❌ {result.error_count} rows failed
                    </Typography>
                    {/* Error Table */}
                    <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
                      {result.errors?.map((err: any, idx: number) => (
                        <Typography key={idx} variant="body2" color="text.secondary">
                          Row {err.row}: {err.error}
                        </Typography>
                      ))}
                    </Box>
                  </>
                )}
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Future: Additional admin tools */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Additional Tools
        </Typography>
        <Typography variant="body2" color="text.secondary">
          More admin features coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};

export default AdminPage;
```

#### Frontend - API Client
```tsx
// src/api/client.ts (ADD)
export const uploadDonorCSV = (formData: FormData) => {
  return apiClient.post('/api/admin/import/donors', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const uploadStripePaymentCSV = (formData: FormData) => {
  return apiClient.post('/api/admin/import/stripe_payments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

#### Frontend - Router
```tsx
// src/App.tsx (UPDATE)
<Route path="/admin" element={<AdminPage />} />

// Navigation
<Button component={Link} to="/admin">Admin</Button>
```

#### Backend - Admin Controller
```ruby
# app/controllers/api/admin_controller.rb (NEW)
class Api::AdminController < ApplicationController
  # Future: Add authorization check
  # before_action :require_admin

  def import_donors
    csv_file = params[:file]

    unless csv_file&.content_type == 'text/csv'
      render json: { error: 'Invalid file type. Please upload a CSV file.' }, status: :unprocessable_entity
      return
    end

    csv_data = csv_file.read
    result = DonorImportService.import_csv(csv_data)

    render json: {
      success_count: result[:imported].size,
      error_count: result[:errors].size,
      errors: result[:errors].map do |error|
        {
          row: error[:row],
          email: error[:email],
          error: error[:reason]
        }
      end
    }
  rescue StandardError => e
    render json: { error: "Import failed: #{e.message}" }, status: :internal_server_error
  end

  def import_stripe_payments
    csv_file = params[:file]

    unless csv_file&.content_type == 'text/csv'
      render json: { error: 'Invalid file type. Please upload a CSV file.' }, status: :unprocessable_entity
      return
    end

    csv_data = csv_file.read
    result = StripePaymentImportService.import_batch(csv_data)

    render json: {
      success_count: result[:imported_count],
      skipped_count: result[:skipped_count],
      error_count: result[:errors]&.size || 0,
      errors: result[:errors]&.map do |error|
        {
          row: error[:row],
          invoice_id: error[:invoice_id],
          error: error[:reason]
        }
      end || []
    }
  rescue StandardError => e
    render json: { error: "Import failed: #{e.message}" }, status: :internal_server_error
  end
end
```

#### Backend - Routes
```ruby
# config/routes.rb (ADD)
namespace :api do
  namespace :admin do
    post 'import/donors', to: 'admin#import_donors'
    post 'import/stripe_payments', to: 'admin#import_stripe_payments'
  end
end
```

#### Backend - Service Updates (if needed)
```ruby
# app/services/donor_import_service.rb (UPDATE if needed)
# Ensure import_csv returns { imported: [], errors: [] } format

# app/services/stripe_payment_import_service.rb (UPDATE if needed)
# Ensure import_batch returns { imported_count, skipped_count, errors: [] } format
```

### UX Design

**Admin Page Layout:**
```
┌─────────────────────────────────────────┐
│  Admin Tools                            │
├─────────────────────────────────────────┤
│                                         │
│  CSV Import                             │
│  ┌───────────────────────────────────┐  │
│  │ Import Type: [Donor Import    ▼]  │  │
│  │                                   │  │
│  │ [Choose File] donors.csv          │  │
│  │                                   │  │
│  │ [Upload CSV]                      │  │
│  │                                   │  │
│  │ ✅ Imported 45 donors successfully│  │
│  │ ❌ 3 rows failed                  │  │
│  │                                   │  │
│  │ Row 5: Invalid email format       │  │
│  │ Row 12: Duplicate email           │  │
│  │ Row 23: Missing name              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Additional Tools                       │
│  ┌───────────────────────────────────┐  │
│  │ More admin features coming soon...│  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Files to Create
**Backend:**
- `app/controllers/api/admin_controller.rb` (NEW - ~80 lines)
- `spec/requests/api/admin_spec.rb` (NEW - ~100 lines, 6 tests)

**Frontend:**
- `src/pages/AdminPage.tsx` (NEW - ~200 lines)
- `src/pages/AdminPage.test.tsx` (NEW - ~120 lines, 8 tests)
- `cypress/e2e/admin-csv-import.cy.ts` (NEW - ~80 lines, 2 tests)

### Files to Modify
**Backend:**
- `config/routes.rb` (add admin namespace routes)
- `app/services/donor_import_service.rb` (ensure consistent return format)
- `app/services/stripe_payment_import_service.rb` (ensure consistent return format)

**Frontend:**
- `src/App.tsx` (add /admin route)
- `src/components/Navigation.tsx` (add Admin tab, if separate nav component)
- `src/api/client.ts` (add upload methods)

### Testing Strategy

**Backend RSpec (6 tests):**
1. POST /admin/import/donors with valid CSV → returns success
2. POST /admin/import/donors with invalid CSV → returns errors
3. POST /admin/import/stripe_payments with valid CSV → returns success
4. POST with missing file → returns 422
5. POST with non-CSV file → returns 422
6. POST with empty CSV → returns error

**Frontend Jest (8 tests):**
1. AdminPage renders
2. File upload input renders
3. Import type selector renders with both options
4. File selection updates state
5. Upload button disabled when no file selected
6. Upload button calls API with FormData
7. Success result displays counts
8. Error result displays error messages

**Cypress E2E (2 tests):**
1. Upload donor CSV → verify success message → navigate to donors page → verify imported
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
- Backend controller + tests: 1.5 hours
- Frontend AdminPage + upload: 1.5 hours
- Frontend tests: 1 hour
- E2E tests: 30 minutes
- **Total:** 4.5 hours

### Success Criteria
- [ ] Admin page accessible via /admin route
- [ ] CSV file upload works for donors
- [ ] CSV file upload works for Stripe payments
- [ ] Success message shows import counts
- [ ] Error messages show row-level details
- [ ] All tests passing (RSpec + Jest + Cypress)
- [ ] TICKET-071 unblocked for testing

### Related Tickets
- TICKET-002: Stripe CSV Donor Import ✅ (backend service)
- TICKET-070: Stripe CSV Import Foundation ✅ (backend service)
- TICKET-071: Stripe CSV Batch Import Task 🟡 (blocked - this unblocks!)
- TICKET-072: Import Error Recovery UI 📋 (could merge into admin page)
- TICKET-008: Authentication with Google OAuth 📋 (add admin check)

### Notes
- **Priority:** High - Unblocks TICKET-071 and enables non-technical CSV imports
- **Future Features:** Database backups, user management, system settings
- **UX:** Simple file upload with clear feedback (errors visible immediately)
- **Tech Debt:** Consider consolidating import services into single polymorphic API
