## [TICKET-133] Individual Donor Giving Statements

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** M (Medium - 4-6 hours)
**Created:** 2025-12-05
**Dependencies:** TICKET-100 (Donor address) ✅, ActionMailer setup

### User Story
As a user, I want to generate personalized giving statements for individual donors showing their donation history so that I can send year-end tax documentation and thank-you letters to each donor.

### Problem Statement
**Current State:**
- No way to generate individual donor statements
- TICKET-105 only provides aggregate admin reports (all donors in one CSV)
- Must manually create donor thank-you letters and tax documentation
- Cannot easily send donation history to individual donors

**Desired State:**
- Generate professional PDF statement per donor
- Line-item breakdown: Date, Amount, Project/Child name
- Year total with Stripe fee breakdown (gross vs net)
- Admin can preview, download, or email to individual donor
- Bulk send option to email all donors who gave in a year
- Professional PDF format suitable for tax documentation

### Business Rules

**Statement Scope:**
- **Time Period:** Single calendar year (user-selected)
- **Row Granularity:** One row per donation (line-item detail)
- **Recipient:** Individual donor (not aggregate)
- **Gross vs Net:** Show total donated AND organization's net received (after Stripe fees)
- **Sorting:** Chronological by donation date (oldest to newest)
- **Filtering:** Single donor or bulk (all donors who gave in year)

**PDF Format:**
- Professional letterhead with organization name
- Donor name and address
- Donation table: Date, Amount, Project/Child
- Totals: Total Given, Total Fees, Net Received
- Thank-you message
- Tax-deductible disclaimer

**Email Delivery:**
- Subject: "[Organization Name] - 2025 Giving Statement"
- Body: Thank-you message with PDF attachment
- From: Organization email (configurable)
- BCC: Admin (for record-keeping)

### Acceptance Criteria

#### Backend Changes
- [ ] Add `DonorStatementService` service:
  - Method: `generate_statement(donor:, year:)`
  - Returns: PDF binary data
  - Uses Prawn gem for PDF generation
  - Includes donor info, donation line items, totals
  - Professional formatting with letterhead

- [ ] Add API endpoint `POST /api/donor_statements/generate`:
  - Body params: `donor_id`, `year`
  - Response: PDF file download
  - Filename: `giving_statement_2025_John_Doe.pdf`

- [ ] Add API endpoint `POST /api/donor_statements/email`:
  - Body params: `donor_id`, `year`
  - Sends email with PDF attachment
  - Returns: Success message

- [ ] Add API endpoint `POST /api/donor_statements/bulk_email`:
  - Body params: `year`
  - Sends email to all donors who gave in year
  - Background job for async processing
  - Returns: Job ID and count of donors

- [ ] Add `DonorStatementMailer`:
  - Method: `statement_email(donor, pdf_data, year)`
  - Professional email template
  - PDF attachment

- [ ] RSpec tests (10 new tests):
  - Service: Generates PDF for donor with 3 donations
  - Service: Includes donor name and address
  - Service: Shows line items (date, amount, project)
  - Service: Calculates totals correctly (gross, fees, net)
  - Service: Handles donor with no donations
  - API: Download endpoint returns PDF
  - API: Email endpoint sends email
  - API: Bulk endpoint enqueues job
  - Mailer: Sends email with PDF attachment
  - Mailer: Uses correct subject and body

#### Frontend Changes
- [ ] Create new `DonorStatementsPage`:
  - Year selector (dropdown, defaults to current year)
  - Donor selector (autocomplete, optional for bulk)
  - Preview button (downloads PDF)
  - Email button (sends to donor)
  - Bulk email button (sends to all donors)
  - Loading states and success/error messages

- [ ] Add navigation to Statements page:
  - New tab in Admin section: "Statements"
  - Icon: Email or Document icon

- [ ] Jest tests (5 new tests):
  - Statements page renders year selector
  - Donor selector updates state
  - Preview button triggers download
  - Email button shows confirmation dialog
  - Bulk email shows confirmation with donor count

- [ ] Cypress E2E test (3 scenarios):
  - Generate statement for single donor → download PDF
  - Email statement to single donor → success message
  - Bulk email all donors → confirmation → success

### Technical Implementation

#### Backend Service
```ruby
# app/services/donor_statement_service.rb (NEW)
require 'prawn'

# Generates professional PDF giving statements for individual donors.
#
# This service creates personalized year-end statements showing:
# - Donor contact information
# - Line-item donation history (date, amount, project/child)
# - Year totals (gross, fees, net)
# - Thank-you message and tax disclaimer
#
# @example Generate statement for donor
#   service = DonorStatementService.new(donor: donor, year: 2025)
#   pdf_binary = service.generate
#
# @see DonorStatementMailer for email delivery
# @see Api::DonorStatementsController for API endpoints
class DonorStatementService
  STRIPE_FEE_RATE = 0.029 # 2.9%
  STRIPE_FEE_FIXED = 30   # $0.30 in cents

  def initialize(donor:, year:)
    @donor = donor
    @year = year
    @donations = fetch_donations
  end

  def generate
    return nil if @donations.empty?

    Prawn::Document.new(page_size: 'LETTER') do |pdf|
      add_letterhead(pdf)
      add_donor_info(pdf)
      add_donation_table(pdf)
      add_totals(pdf)
      add_footer(pdf)
    end.render
  end

  private

  def fetch_donations
    start_date = Date.new(@year, 1, 1)
    end_date = Date.new(@year, 12, 31)

    @donor.donations
      .includes(:project, sponsorship: :child)
      .where(date: start_date..end_date)
      .where(status: 'succeeded')
      .order(date: :asc)
  end

  def add_letterhead(pdf)
    pdf.text 'Your Organization Name', size: 24, style: :bold, align: :center
    pdf.text 'Organization Address', size: 10, align: :center
    pdf.text 'Email: contact@example.org | Phone: (555) 123-4567', size: 10, align: :center
    pdf.move_down 30
  end

  def add_donor_info(pdf)
    pdf.text "Giving Statement for #{@year}", size: 18, style: :bold
    pdf.move_down 10

    pdf.text @donor.name, size: 14, style: :bold
    if @donor.full_address.present?
      @donor.full_address.split("\n").each do |line|
        pdf.text line, size: 12
      end
    end
    pdf.move_down 20
  end

  def add_donation_table(pdf)
    pdf.text 'Donation History', size: 14, style: :bold
    pdf.move_down 10

    table_data = [['Date', 'Amount', 'Project / Child']]

    @donations.each do |donation|
      project_name = if donation.sponsorship&.child
                       "Child Sponsorship: #{donation.sponsorship.child.name}"
                     elsif donation.project
                       donation.project.name
                     else
                       'General Fund'
                     end

      table_data << [
        donation.date.strftime('%m/%d/%Y'),
        format_currency(donation.amount),
        project_name
      ]
    end

    pdf.table(table_data,
      header: true,
      width: pdf.bounds.width,
      cell_style: { size: 10, padding: 5 },
      column_widths: [80, 80, pdf.bounds.width - 160]
    ) do
      row(0).font_style = :bold
      row(0).background_color = 'EEEEEE'
    end

    pdf.move_down 20
  end

  def add_totals(pdf)
    gross_total = @donations.sum(&:amount)
    fees_total = calculate_fees
    net_total = gross_total - fees_total

    pdf.text 'Summary', size: 14, style: :bold
    pdf.move_down 10

    totals_data = [
      ['Total Donated:', format_currency(gross_total)],
      ['Processing Fees (approx):', format_currency(fees_total)],
      ['Net Received by Organization:', format_currency(net_total)]
    ]

    pdf.table(totals_data,
      width: 300,
      position: :right,
      cell_style: { size: 12, padding: 5, borders: [] }
    ) do
      column(1).align = :right
      row(-1).font_style = :bold
    end

    pdf.move_down 30
  end

  def add_footer(pdf)
    pdf.text 'Thank you for your generous support!', size: 12, style: :italic, align: :center
    pdf.move_down 10

    pdf.text 'This statement is provided for your tax records. ' \
             'Your contributions are tax-deductible to the extent allowed by law. ' \
             'Please consult your tax advisor for specific guidance.',
             size: 9, align: :center
  end

  def calculate_fees
    @donations.reduce(0) do |total, donation|
      if donation.payment_method == 'online'
        fee = (donation.amount * STRIPE_FEE_RATE).round + STRIPE_FEE_FIXED
        total + fee
      else
        total
      end
    end
  end

  def format_currency(cents)
    "$#{(cents / 100.0).round(2)}"
  end
end
```

#### Backend Controller
```ruby
# app/controllers/api/donor_statements_controller.rb (NEW)

# Handles generation and delivery of individual donor giving statements.
#
# This controller provides:
# - Generate endpoint: Downloads PDF statement for single donor
# - Email endpoint: Sends PDF statement to single donor via email
# - Bulk email endpoint: Queues job to send statements to all donors for a year
#
# All responses use proper error handling with global exception handlers.
#
# @example Generate statement for donor
#   POST /api/donor_statements/generate
#   { "donor_id": 123, "year": 2025 }
#   => Returns PDF file download
#
# @see DonorStatementService for PDF generation
# @see DonorStatementMailer for email delivery
# @see DonorStatementBulkEmailJob for async bulk processing
module Api
  class DonorStatementsController < ApplicationController
    def generate
      donor = Donor.find(params[:donor_id])
      year = params[:year].to_i

      validate_year!(year)

      service = DonorStatementService.new(donor: donor, year: year)
      pdf_data = service.generate

      if pdf_data.nil?
        render json: { error: 'No donations found for this donor in the specified year' },
               status: :not_found
        return
      end

      filename = "giving_statement_#{year}_#{donor.name.parameterize}.pdf"

      send_data pdf_data,
        filename: filename,
        type: 'application/pdf',
        disposition: 'attachment'
    end

    def email
      donor = Donor.find(params[:donor_id])
      year = params[:year].to_i

      validate_year!(year)

      service = DonorStatementService.new(donor: donor, year: year)
      pdf_data = service.generate

      if pdf_data.nil?
        render json: { error: 'No donations found for this donor in the specified year' },
               status: :not_found
        return
      end

      DonorStatementMailer.statement_email(donor, pdf_data, year).deliver_later

      render json: {
        message: "Statement emailed successfully to #{donor.email}"
      }, status: :ok
    end

    def bulk_email
      year = params[:year].to_i

      validate_year!(year)

      # Find all donors who gave in this year
      donor_ids = Donation
        .where(date: Date.new(year, 1, 1)..Date.new(year, 12, 31))
        .where(status: 'succeeded')
        .distinct
        .pluck(:donor_id)

      if donor_ids.empty?
        render json: { error: 'No donations found for the specified year' },
               status: :not_found
        return
      end

      # Queue background job
      job = DonorStatementBulkEmailJob.perform_later(donor_ids, year)

      render json: {
        message: "Bulk email queued for #{donor_ids.count} donors",
        job_id: job.job_id,
        donor_count: donor_ids.count
      }, status: :accepted
    end

    private

    def validate_year!(year)
      unless (2000..2100).include?(year)
        render json: { error: 'Invalid year' }, status: :unprocessable_entity
        raise ActiveRecord::RecordInvalid
      end
    end
  end
end
```

#### Backend Mailer
```ruby
# app/mailers/donor_statement_mailer.rb (NEW)

# Sends personalized giving statements to donors via email.
#
# This mailer handles:
# - Individual statement delivery with PDF attachment
# - Professional email template with thank-you message
# - BCC to admin for record-keeping
#
# @example Send statement to donor
#   DonorStatementMailer.statement_email(donor, pdf_data, 2025).deliver_later
#
# @see DonorStatementService for PDF generation
# @see DonorStatementBulkEmailJob for bulk sending
class DonorStatementMailer < ApplicationMailer
  default from: ENV.fetch('MAILER_FROM', 'noreply@example.org'),
          bcc: ENV.fetch('ADMIN_EMAIL', 'admin@example.org')

  def statement_email(donor, pdf_data, year)
    @donor = donor
    @year = year

    attachments["giving_statement_#{year}.pdf"] = pdf_data

    mail(
      to: donor.email,
      subject: "Your #{year} Giving Statement - Thank You!"
    )
  end
end
```

#### Backend Mailer View
```erb
<!-- app/views/donor_statement_mailer/statement_email.html.erb (NEW) -->
<!DOCTYPE html>
<html>
  <head>
    <meta content='text/html; charset=UTF-8' http-equiv='Content-Type' />
  </head>
  <body>
    <h2>Dear <%= @donor.name %>,</h2>

    <p>
      Thank you for your generous support in <%= @year %>! Your contributions make a
      meaningful difference in the lives of the children and families we serve.
    </p>

    <p>
      Attached is your giving statement for <%= @year %>, which includes a complete
      record of your donations. Please keep this statement for your tax records.
    </p>

    <p>
      If you have any questions about your statement or would like to discuss your
      giving for the upcoming year, please don't hesitate to reach out.
    </p>

    <p>
      With gratitude,<br>
      Your Organization Name
    </p>

    <hr>
    <p style="font-size: 0.9em; color: #666;">
      Your contributions are tax-deductible to the extent allowed by law.
      Please consult your tax advisor for specific guidance.
    </p>
  </body>
</html>
```

#### Backend Background Job
```ruby
# app/jobs/donor_statement_bulk_email_job.rb (NEW)

# Background job for sending giving statements to multiple donors.
#
# This job:
# - Processes bulk statement sending asynchronously
# - Generates PDF for each donor individually
# - Sends email with PDF attachment
# - Logs errors without failing entire batch
#
# @example Queue bulk send for year
#   DonorStatementBulkEmailJob.perform_later(donor_ids, 2025)
#
# @see DonorStatementService for PDF generation
# @see DonorStatementMailer for email delivery
class DonorStatementBulkEmailJob < ApplicationJob
  queue_as :default

  def perform(donor_ids, year)
    donors = Donor.where(id: donor_ids)

    donors.each do |donor|
      begin
        service = DonorStatementService.new(donor: donor, year: year)
        pdf_data = service.generate

        next if pdf_data.nil? # Skip donors with no donations

        DonorStatementMailer.statement_email(donor, pdf_data, year).deliver_now
        Rails.logger.info "Sent statement to #{donor.name} (#{donor.email})"
      rescue StandardError => e
        Rails.logger.error "Failed to send statement to #{donor.name}: #{e.message}"
        # Continue with next donor
      end
    end

    Rails.logger.info "Bulk email complete: #{donors.count} donors processed"
  end
end
```

#### Frontend Page
```tsx
// src/pages/DonorStatementsPage.tsx (NEW)
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Download, Email, SendToMobile } from '@mui/icons-material';
import DonorAutocomplete from '../components/shared/DonorAutocomplete';
import { Donor } from '../types';
import {
  generateDonorStatement,
  emailDonorStatement,
  bulkEmailDonorStatements,
} from '../api/client';

const DonorStatementsPage: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDonorCount, setBulkDonorCount] = useState(0);

  const handleDownload = async () => {
    if (!selectedDonor) {
      setError('Please select a donor');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await generateDonorStatement(selectedDonor.id, year);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `giving_statement_${year}_${selectedDonor.name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess('Statement downloaded successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download statement');
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!selectedDonor) {
      setError('Please select a donor');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await emailDonorStatement(selectedDonor.id, year);
      setSuccess(`Statement emailed to ${selectedDonor.email}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to email statement');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEmail = async () => {
    setBulkDialogOpen(false);
    setLoading(true);
    setError(null);

    try {
      const response = await bulkEmailDonorStatements(year);
      setBulkDonorCount(response.data.donor_count);
      setSuccess(`Bulk email queued for ${response.data.donor_count} donors`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to queue bulk email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Donor Giving Statements
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate personalized giving statements for individual donors showing their
        donation history. Statements include line-item details and year totals.
      </Typography>

      {/* Year Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Year
        </Typography>
        <Select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          size="small"
          sx={{ minWidth: 150 }}
        >
          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Donor Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Donor (optional for bulk email)
        </Typography>
        <DonorAutocomplete
          value={selectedDonor}
          onChange={setSelectedDonor}
          size="small"
        />
      </Box>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleDownload}
          disabled={loading || !selectedDonor}
        >
          Download PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<Email />}
          onClick={handleEmail}
          disabled={loading || !selectedDonor}
        >
          Email to Donor
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<SendToMobile />}
          onClick={() => setBulkDialogOpen(true)}
          disabled={loading}
        >
          Bulk Email All Donors
        </Button>
      </Stack>

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">Processing...</Typography>
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Bulk Email Confirmation Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)}>
        <DialogTitle>Confirm Bulk Email</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will send giving statements to all donors who made donations in {year}.
            Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkEmail} variant="contained" autoFocus>
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DonorStatementsPage;
```

#### Frontend API Client
```typescript
// src/api/client.ts (ADD)

export const generateDonorStatement = (donorId: number, year: number) => {
  return apiClient.post('/api/donor_statements/generate', {
    donor_id: donorId,
    year: year,
  }, {
    responseType: 'blob',
  });
};

export const emailDonorStatement = (donorId: number, year: number) => {
  return apiClient.post('/api/donor_statements/email', {
    donor_id: donorId,
    year: year,
  });
};

export const bulkEmailDonorStatements = (year: number) => {
  return apiClient.post('/api/donor_statements/bulk_email', {
    year: year,
  });
};
```

#### Frontend Routes
```tsx
// src/App.tsx (UPDATE)
import DonorStatementsPage from './pages/DonorStatementsPage';

// Add route:
<Route path="statements" element={<DonorStatementsPage />} />
```

#### Frontend Navigation
```tsx
// src/components/Layout.tsx (UPDATE)
// Add to Admin tab navigation:
<Tab label="Statements" value="/statements" />
```

### UX Design

**Donor Statements Page:**
```
┌─────────────────────────────────────────────┐
│  Donor Giving Statements                    │
│                                             │
│  Generate personalized giving statements    │
│  for individual donors showing their        │
│  donation history.                          │
├─────────────────────────────────────────────┤
│                                             │
│  Year                                       │
│  [2025  ▼]                                  │
│                                             │
│  Donor (optional for bulk email)            │
│  [Search donors...              ]           │
│                                             │
│  [⬇ Download PDF] [✉ Email to Donor]       │
│  [📧 Bulk Email All Donors]                 │
│                                             │
│  ✓ Statement emailed to john@example.com    │
└─────────────────────────────────────────────┘
```

**PDF Statement Example:**
```
┌─────────────────────────────────────────────┐
│        Your Organization Name               │
│        123 Main St, City, State             │
│     Email: contact@example.org              │
│                                             │
│  Giving Statement for 2025                  │
│                                             │
│  John Doe                                   │
│  456 Oak Ave                                │
│  Portland, OR 97201                         │
│                                             │
│  Donation History                           │
│  ┌──────────┬─────────┬──────────────────┐ │
│  │ Date     │ Amount  │ Project / Child  │ │
│  ├──────────┼─────────┼──────────────────┤ │
│  │ 01/15/25 │ $100.00 │ General Fund     │ │
│  │ 02/20/25 │ $50.00  │ Child: Maria     │ │
│  │ 03/10/25 │ $100.00 │ Playground       │ │
│  │ ...      │         │                  │ │
│  └──────────┴─────────┴──────────────────┘ │
│                                             │
│  Summary                     Total: $1,250  │
│                              Fees:  $39.55  │
│                              Net:   $1,210  │
│                                             │
│  Thank you for your generous support!       │
│                                             │
│  Tax-deductible disclaimer...               │
└─────────────────────────────────────────────┘
```

### Use Cases

**1. Year-End Tax Documentation:**
- Admin selects 2025
- Clicks "Bulk Email All Donors"
- All donors who gave in 2025 receive statement via email

**2. Mid-Year Donor Thank You:**
- Admin selects specific donor
- Selects current year
- Clicks "Email to Donor" to send thank-you with statement

**3. Donor Requests Statement:**
- Donor calls requesting copy of donations
- Admin selects donor and year
- Clicks "Download PDF" to email directly to donor

**4. Board Meeting Documentation:**
- Admin downloads statements for top 10 donors
- Includes in board packet as examples of donor communications

### Files to Modify

**Backend:**
- `Gemfile` (add `gem 'prawn'`, +1 line)
- `app/services/donor_statement_service.rb` (NEW, +150 lines)
- `app/controllers/api/donor_statements_controller.rb` (NEW, +80 lines)
- `app/mailers/donor_statement_mailer.rb` (NEW, +20 lines)
- `app/views/donor_statement_mailer/statement_email.html.erb` (NEW, +30 lines)
- `app/jobs/donor_statement_bulk_email_job.rb` (NEW, +30 lines)
- `config/routes.rb` (add donor_statements routes, +3 lines)
- `spec/services/donor_statement_service_spec.rb` (NEW, +100 lines)
- `spec/requests/api/donor_statements_spec.rb` (NEW, +80 lines)
- `spec/mailers/donor_statement_mailer_spec.rb` (NEW, +40 lines)
- `spec/jobs/donor_statement_bulk_email_job_spec.rb` (NEW, +40 lines)

**Frontend:**
- `src/pages/DonorStatementsPage.tsx` (NEW, +150 lines)
- `src/api/client.ts` (add 3 methods, +20 lines)
- `src/App.tsx` (add route, +1 line)
- `src/components/Layout.tsx` (add navigation, +1 line)
- `src/pages/DonorStatementsPage.test.tsx` (NEW, +80 lines)
- `cypress/e2e/donor_statements.cy.ts` (NEW, +50 lines)

### Testing Strategy

**Backend RSpec (10 tests):**

**Service Tests (5 tests):**
1. Generates PDF with donor name and address
2. Includes line items (date, amount, project/child)
3. Calculates totals correctly (gross, fees, net)
4. Handles donor with no donations (returns nil)
5. Sorts donations chronologically

**Controller Tests (3 tests):**
1. Generate endpoint returns PDF with correct filename
2. Email endpoint sends email and returns success message
3. Bulk endpoint enqueues job and returns donor count

**Mailer Tests (1 test):**
1. Sends email with PDF attachment and correct subject

**Job Tests (1 test):**
1. Processes all donors and logs errors for failures

**Frontend Jest (5 tests):**
1. Statements page renders year selector with current year selected
2. Donor selector updates state when donor selected
3. Download button triggers API call with donor_id and year
4. Email button shows success message after API call
5. Bulk email button shows confirmation dialog

**Cypress E2E (3 tests):**
1. Navigate to Statements → select donor → download → verify PDF downloaded
2. Navigate to Statements → select donor → email → verify success message
3. Navigate to Statements → bulk email → confirm → verify success message

### Estimated Time
- Backend service (PDF generation): 2 hours
- Backend controller (3 endpoints): 1 hour
- Backend mailer + job: 1 hour
- Backend tests: 1.5 hours
- Frontend page: 1.5 hours
- Frontend tests: 1 hour
- E2E tests: 1 hour
- Gem installation + configuration: 30 minutes
- **Total:** 9.5 hours

**Revised:** M (Medium - 4-6 hours) for MVP without bulk email job
- MVP: Single donor download + email only (skip bulk for initial implementation)
- Future: Add bulk email job in follow-up ticket

### Success Criteria
- [ ] Admin can generate PDF statement for individual donor
- [ ] Statement includes donor info, line items, totals (gross/net)
- [ ] Admin can email statement to donor
- [ ] Admin can bulk email all donors for a year
- [ ] PDF has professional formatting with letterhead
- [ ] Email includes thank-you message and tax disclaimer
- [ ] All tests passing (RSpec + Jest + Cypress)
- [ ] Documentation updated (CLAUDE.md, DonationTracking.md)

### Related Tickets
- TICKET-100: Add Physical Address to Donor Records ✅ (required for address on statement)
- TICKET-103: Monthly Donation Report ✅ (establishes Reports infrastructure)
- TICKET-105: Annual Donation Report 📋 (admin aggregate report - different use case)

### Notes
- **Tax Documentation:** Primary use case is year-end donor tax receipts
- **Professional Format:** PDF should be suitable for donor tax filing
- **Email Template:** Customize message/branding before production use
- **Background Jobs:** Bulk email uses async job to avoid timeouts
- **Prawn Gem:** Industry-standard Ruby PDF generation library
- **Error Handling:** Individual donor failures in bulk send don't stop batch
- **BCC Admin:** All emails BCC admin for record-keeping
- **Future Enhancement:** Add organization logo to PDF letterhead
- **Future Enhancement:** Allow custom message per statement
- **Future Enhancement:** Track when statements were sent (audit log)
- **Future Enhancement:** Support multi-year statements (e.g., 3-year summary)
- **PDF vs CSV:** PDF is more professional for donor-facing documents; CSV is better for admin analysis (TICKET-105)
