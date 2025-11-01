## [TICKET-072] Import Error Recovery UI

**Status:** 📋 Planned
**Priority:** 🟢 Low (OPTIONAL - Can Skip)
**Dependencies:** TICKET-070, TICKET-071
**Created:** 2025-11-01

**⚠️ CODE LIFECYCLE: OPTIONAL - May Not Be Needed**

**CONSIDER SKIPPING THIS TICKET if:**
- CSV import (TICKET-071) completes with <10 failures
- Failures can be manually retried via rake task
- Time is limited and error volume is low

**IMPLEMENT THIS TICKET if:**
- CSV import has >10 failures
- Need UI for non-technical admin to review errors
- Want comprehensive error tracking

**This is throwaway code (like TICKET-071).** After CSV import stabilizes, this code can be removed.

### User Story
As an admin, I want to review failed import rows from the Stripe CSV import so that I can manually fix data issues and retry imports without re-running the entire batch.

### Problem Statement
When running `rails stripe:import_csv`, some rows may fail due to:
- Missing donor name/email
- Invalid date formats
- Child name extraction failures
- Data validation errors

Currently, failed rows are only displayed in terminal output. Admins need:
- Persistent storage of failed imports
- Web UI to review failures
- Ability to edit and retry individual rows
- Ability to mark rows as skipped (won't retry)

### Acceptance Criteria
- [ ] Backend: Create `ImportError` model with row data, error message, status
- [ ] Backend: `StripeCsvBatchImporter` saves failed rows to `ImportError` table
- [ ] Backend: API endpoint GET `/api/import_errors` with pagination
- [ ] Backend: API endpoint PATCH `/api/import_errors/:id/retry` (re-import single row)
- [ ] Backend: API endpoint PATCH `/api/import_errors/:id/skip` (mark as resolved)
- [ ] Backend: RSpec tests for ImportError model and endpoints
- [ ] Frontend: ImportErrorsPage component
- [ ] Frontend: Display failed rows in table (row number, error message, data preview)
- [ ] Frontend: Retry button per row (calls retry endpoint)
- [ ] Frontend: Skip button per row (marks as resolved)
- [ ] Frontend: Filter by status (pending/retried/skipped)
- [ ] Frontend: Jest tests for ImportErrorsPage
- [ ] Cypress E2E test for error review workflow
- [ ] All tests pass (90% backend, 80% frontend coverage)

### Technical Approach

#### 1. Database Model

```ruby
# db/migrate/YYYYMMDD_create_import_errors.rb
class CreateImportErrors < ActiveRecord::Migration[8.0]
  def change
    create_table :import_errors do |t|
      t.integer :row_number
      t.text :error_message
      t.text :row_data # JSON serialized row data
      t.string :status, default: 'pending' # pending, retried, skipped
      t.string :import_type, default: 'stripe_csv' # Future: other import types
      t.datetime :resolved_at

      t.timestamps
    end

    add_index :import_errors, :status
    add_index :import_errors, :import_type
  end
end

# app/models/import_error.rb
class ImportError < ApplicationRecord
  serialize :row_data, coder: JSON

  enum :status, { pending: 0, retried: 1, skipped: 2 }, prefix: true

  validates :row_number, presence: true
  validates :error_message, presence: true

  scope :pending, -> { where(status: :pending) }
  scope :stripe_csv, -> { where(import_type: 'stripe_csv') }

  def retry_import
    service = StripePaymentImportService.new(row_data)
    result = service.import

    if result[:success] && !result[:skipped]
      update!(status: :retried, resolved_at: Time.current)
      result
    else
      # Still failed, update error message
      update!(error_message: result[:errors]&.first || result[:reason])
      result
    end
  end

  def mark_skipped
    update!(status: :skipped, resolved_at: Time.current)
  end
end
```

#### 2. Update Batch Importer to Save Errors

```ruby
# app/services/stripe_csv_batch_importer.rb (modified)
class StripeCsvBatchImporter
  # ... existing code ...

  private

  def record_error(row_number, message, row_data)
    errors << {
      row: row_number,
      message: message,
      data: sanitize_row_data(row_data)
    }

    # NEW: Persist to database for UI review
    ImportError.create!(
      row_number: row_number,
      error_message: message,
      row_data: sanitize_row_data(row_data),
      import_type: 'stripe_csv',
      status: :pending
    )
  rescue StandardError => e
    # Don't let import error saving break the import
    Rails.logger.error("Failed to save import error: #{e.message}")
  end
end
```

#### 3. API Endpoints

```ruby
# config/routes.rb
namespace :api do
  resources :import_errors, only: [:index] do
    member do
      patch :retry
      patch :skip
    end
  end
end

# app/controllers/api/import_errors_controller.rb
class Api::ImportErrorsController < ApplicationController
  include PaginationConcern

  def index
    scope = ImportError.stripe_csv.order(created_at: :desc)
    scope = scope.where(status: params[:status]) if params[:status].present?

    errors = paginate_collection(scope)

    render json: {
      import_errors: errors.as_json(methods: [:formatted_row_data]),
      meta: pagination_meta(errors)
    }
  end

  def retry
    import_error = ImportError.find(params[:id])
    result = import_error.retry_import

    if result[:success]
      render json: {
        message: 'Import retried successfully',
        import_error: import_error.as_json
      }
    else
      render json: {
        message: 'Retry failed',
        errors: result[:errors],
        import_error: import_error.as_json
      }, status: :unprocessable_entity
    end
  end

  def skip
    import_error = ImportError.find(params[:id])
    import_error.mark_skipped

    render json: {
      message: 'Import error marked as skipped',
      import_error: import_error.as_json
    }
  end
end

# app/models/import_error.rb (add method)
def formatted_row_data
  {
    amount: row_data['amount'],
    name: row_data['name'],
    email: row_data['email'],
    description: row_data['description'],
    date: row_data['date']
  }
end
```

#### 4. Frontend Component

```tsx
// src/pages/ImportErrorsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Box,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { usePagination } from '../hooks';
import axios from 'axios';

interface ImportError {
  id: number;
  row_number: number;
  error_message: string;
  status: 'pending' | 'retried' | 'skipped';
  formatted_row_data: {
    amount: string;
    name: string;
    email: string;
    description: string;
    date: string;
  };
  created_at: string;
}

const ImportErrorsPage: React.FC = () => {
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { currentPage, paginationMeta, setPaginationMeta, handlePageChange } = usePagination();

  const fetchErrors = async () => {
    try {
      const response = await axios.get('/api/import_errors', {
        params: { page: currentPage, per_page: 25, status: statusFilter }
      });
      setErrors(response.data.import_errors);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch import errors:', error);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [currentPage, statusFilter]);

  const handleRetry = async (errorId: number) => {
    try {
      await axios.patch(`/api/import_errors/${errorId}/retry`);
      setSuccessMessage('Import retried successfully');
      fetchErrors(); // Refresh list
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const handleSkip = async (errorId: number) => {
    try {
      await axios.patch(`/api/import_errors/${errorId}/skip`);
      setSuccessMessage('Import error skipped');
      fetchErrors(); // Refresh list
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Skip failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'retried': return 'success';
      case 'skipped': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Import Errors
        </Typography>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
        )}

        <FormControl sx={{ mb: 2, minWidth: 200 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status Filter"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="retried">Retried</MenuItem>
            <MenuItem value="skipped">Skipped</MenuItem>
          </Select>
        </FormControl>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Row</TableCell>
                <TableCell>Error</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {errors.map((error) => (
                <TableRow key={error.id}>
                  <TableCell>{error.row_number}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" color="error">
                      {error.error_message}
                    </Typography>
                  </TableCell>
                  <TableCell>{error.formatted_row_data.name}</TableCell>
                  <TableCell>{error.formatted_row_data.email}</TableCell>
                  <TableCell>${error.formatted_row_data.amount}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    {error.formatted_row_data.description}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={error.status}
                      color={getStatusColor(error.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {error.status === 'pending' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleRetry(error.id)}
                        >
                          Retry
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSkip(error.id)}
                        >
                          Skip
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default ImportErrorsPage;
```

#### 5. Add Route to App

```tsx
// src/App.tsx (add route)
<Route path="import-errors" element={<ImportErrorsPage />} />

// src/components/Navigation.tsx (add link)
<Button color="inherit" component={NavLink} to="/import-errors">
  Import Errors
</Button>
```

### Testing Strategy

```ruby
# spec/models/import_error_spec.rb
RSpec.describe ImportError do
  describe 'validations' do
    it { should validate_presence_of(:row_number) }
    it { should validate_presence_of(:error_message) }
  end

  describe '#retry_import' do
    it 'calls StripePaymentImportService with row data'
    it 'updates status to retried on success'
    it 'updates resolved_at timestamp'
    it 'updates error_message if retry fails'
  end

  describe '#mark_skipped' do
    it 'updates status to skipped'
    it 'updates resolved_at timestamp'
  end
end

# spec/requests/api/import_errors_spec.rb
RSpec.describe 'Api::ImportErrors' do
  describe 'GET /api/import_errors' do
    it 'returns paginated import errors'
    it 'filters by status'
    it 'orders by created_at desc'
  end

  describe 'PATCH /api/import_errors/:id/retry' do
    it 'retries import'
    it 'returns success message'
    it 'returns error if retry fails'
  end

  describe 'PATCH /api/import_errors/:id/skip' do
    it 'marks error as skipped'
    it 'returns success message'
  end
end
```

```tsx
// src/pages/__tests__/ImportErrorsPage.test.tsx
describe('ImportErrorsPage', () => {
  it('renders import errors table', () => {});
  it('filters errors by status', () => {});
  it('calls retry endpoint on retry button click', () => {});
  it('calls skip endpoint on skip button click', () => {});
  it('displays success message after retry', () => {});
});
```

### Files to Create
- `db/migrate/YYYYMMDD_create_import_errors.rb`
- `app/models/import_error.rb`
- `app/controllers/api/import_errors_controller.rb`
- `spec/models/import_error_spec.rb`
- `spec/requests/api/import_errors_spec.rb`
- `src/pages/ImportErrorsPage.tsx`
- `src/pages/__tests__/ImportErrorsPage.test.tsx`

### Files to Modify
- `app/services/stripe_csv_batch_importer.rb` (persist errors to database)
- `config/routes.rb` (add import_errors endpoints)
- `src/App.tsx` (add route)
- `src/components/Navigation.tsx` (add nav link)

### Related Tickets
- TICKET-070: Stripe CSV Import Foundation (⭐ PERMANENT - provides import service)
- TICKET-071: Stripe CSV Batch Import Task (🗑️ TEMPORARY - generates errors to review)

### Code Lifecycle & Decision Tree

**THROWAWAY CODE (Delete After CSV Import Stabilizes):**
- `ImportError` model - Only tracks CSV import failures
- `Api::ImportErrorsController` - UI for CSV errors
- `ImportErrorsPage.tsx` - Frontend error review
- All related specs

**DECISION TREE:**

```
CSV Import Complete (TICKET-071)
│
├─ Failures < 10?
│  ├─ YES → SKIP THIS TICKET
│  │        - Manually retry failed rows via rake task
│  │        - Save development time
│  │        - No UI maintenance burden
│  │
│  └─ NO → IMPLEMENT THIS TICKET
│           - Build error review UI
│           - Enable non-technical retry
│           - Delete after all errors resolved
│
└─ After All Errors Fixed
   └─ DELETE THIS CODE
      - CSV import is one-time
      - Future errors come from webhooks (different system)
      - No ongoing maintenance needed
```

**POST-IMPORT CLEANUP:**
If this ticket was implemented:
1. All import errors reviewed and fixed
2. Delete `ImportError` model and migration
3. Delete `Api::ImportErrorsController`
4. Delete `ImportErrorsPage.tsx`
5. Remove route from `routes.rb`
6. Remove navigation link

### Notes
- This is a **FUTURE enhancement** (not MVP for initial import)
- Can be implemented **AFTER** TICKET-071 if import errors are significant
- If initial import has <10 failures, **skip this ticket entirely**
- Even if implemented, **this is throwaway code** (delete after CSV import stabilizes)
- Webhook errors (TICKET-026) would need a different error tracking system
- **Recommended:** Run TICKET-071 first, assess failure count, then decide
