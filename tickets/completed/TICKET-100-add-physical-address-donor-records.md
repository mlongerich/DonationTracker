## [TICKET-100] Add Phone Number and Physical Address to Donor Records

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** M (Medium - 5-6 hours)
**Created:** 2025-11-12
**Updated:** 2025-11-28
**Completed:** 2025-11-28
**Dependencies:** None

### User Story
As a user, I want to store phone numbers and physical addresses for donors so that I can contact them via phone/mail, generate mailing lists for tax receipts, newsletters, and generate comprehensive donor reports.

### Problem Statement
**Current State:**
- Donor records only store name and email
- Cannot contact donors via phone
- Cannot send physical mail or tax receipts
- Export functionality (TICKET-088) expects phone/address fields but they don't exist
- Reports (TICKET-103, TICKET-104, TICKET-105) require phone/address data

**Desired State:**
- Donors have phone number for direct contact
- Donors have complete address information (street, city, state, zip)
- Phone and address appear in donor list cards
- Phone and address included in donor export (CSV)
- Phone and address available for donor reports
- Phone is searchable via Ransack

### Acceptance Criteria

#### Backend Changes
- [x] Add migration to add phone and address fields to donors table:
  - `phone` (string, optional)
  - `address_line1` (string, optional)
  - `address_line2` (string, optional, nullable)
  - `city` (string, optional)
  - `state` (string, optional)
  - `zip_code` (string, optional)
  - `country` (string, optional, default: 'USA')

- [x] Update Donor model:
  - Validation: phone format (phonelib gem - international support)
  - Validation: zip_code format (validates_zipcode gem - 233 countries)
  - Validation: 4-digit US zip codes auto-padded with leading zero
  - Add `full_address` method to format complete address
  - Add phone and address fields to `ransackable_attributes` for search
  - **BONUS:** Anonymous email generation from phone/address (prevents duplicate anonymous donors)

- [x] Update DonorPresenter to include phone and address fields

- [x] Update DonorsController `permit` params to include phone and address fields

- [x] RSpec tests (11+ new tests):
  - Model: Accepts valid US phone (various formats) ✅
  - Model: Rejects invalid phone ✅
  - Model: Phone is optional (allows blank) ✅
  - Model: Zip code normalization (4-digit → 5-digit with leading zero) ✅
  - Model: full_address returns formatted string ✅
  - Model: full_address handles missing fields gracefully ✅
  - Model: Anonymous email from phone ✅
  - Model: Anonymous email from address ✅
  - Model: Phone priority over address for anonymous ✅
  - Presenter: Includes phone and all address fields ✅
  - Request: Ransack OR combinator search across all fields ✅
  - DonorService: Preserves existing phone/address when blank updates ✅
  - DonorService: Updates phone/address when non-blank updates ✅
  - DonorMergeService: Composite address field selection ✅

#### Frontend Changes
- [x] Update DonorForm (use Stack spacing pattern):
  - Add phone TextField (optional, before address) ✅
  - Add address_line1 TextField (optional) ✅
  - Add address_line2 TextField (optional) ✅
  - Add city TextField (optional) ✅
  - Add state TextField (free-text for international) ✅
  - Add zip_code TextField (optional) ✅
  - Add country TextField (default: 'US', optional) ✅

- [x] Update DonorList cards:
  - Display phone below email (if present) ✅
  - Display formatted address below phone (if present) ✅
  - Use muted text color for phone/address ✅

- [x] Update DonorMergeModal:
  - Phone field selection ✅
  - Address composite field selection ✅
  - useEffect initialization fix for async donor loading ✅

- [x] Update TypeScript Donor interface:
  - Add phone and all address fields ✅

- [x] Update useDonors hook:
  - Ransack grouping syntax for omni-search ✅

- [x] Jest tests (15+ new tests):
  - DonorForm renders phone and address fields ✅
  - DonorForm submits phone and address data ✅
  - DonorList displays phone when present ✅
  - DonorList displays address when present ✅
  - DonorMergeModal phone/address radio buttons ✅
  - DonorMergeModal onConfirm with all 4 fields ✅
  - DonorMergeModal async donor initialization ✅
  - DonorsPage Ransack grouping query ✅

- [x] Cypress E2E tests (5 scenarios):
  - Create donor with full phone/address → verify saved and displayed ✅
  - Edit donor to add phone/address → verify updated ✅
  - Search for donor by phone number → verify found ✅
  - Search for donor by city → verify found ✅
  - Donation entry with updated selectors for new fields ✅

### Technical Implementation

#### Backend Migration
```ruby
# db/migrate/YYYYMMDDHHMMSS_add_phone_and_address_to_donors.rb
class AddPhoneAndAddressToDonors < ActiveRecord::Migration[7.0]
  def change
    add_column :donors, :phone, :string
    add_column :donors, :address_line1, :string
    add_column :donors, :address_line2, :string
    add_column :donors, :city, :string
    add_column :donors, :state, :string
    add_column :donors, :zip_code, :string
    add_column :donors, :country, :string, default: 'USA'
  end
end
```

#### Backend Model
```ruby
# app/models/donor.rb (UPDATE)
class Donor < ApplicationRecord
  # ... existing code ...

  # Validations
  validates :phone, format: {
    with: /\A(\d{10}|\(\d{3}\)\s?\d{3}-\d{4}|\d{3}-\d{3}-\d{4})\z/,
    message: 'must be valid US phone (e.g., 5551234567, (555) 123-4567, 555-123-4567)',
    allow_blank: true
  }

  validates :zip_code, format: {
    with: /\A\d{5}(-\d{4})?\z/,
    message: 'must be 5 digits or 9 digits with dash (e.g., 12345 or 12345-6789)',
    allow_blank: true
  }

  validates :state, format: {
    with: /\A[A-Z]{2}\z/,
    message: 'must be 2-letter state code (e.g., CA, NY)',
    allow_blank: true
  }

  # Ransack: Add phone to searchable attributes
  def self.ransackable_attributes(_auth_object = nil)
    [ "name", "email", "phone", "created_at", "updated_at", "last_updated_at", "name_or_email", "discarded_at" ]
  end

  # Format complete address
  def full_address
    parts = [
      address_line1,
      address_line2,
      city_state_zip,
      country_display
    ].compact.reject(&:blank?)

    parts.any? ? parts.join("\n") : nil
  end

  private

  def city_state_zip
    [
      city,
      state,
      zip_code
    ].compact.reject(&:blank?).join(' ')
  end

  def country_display
    country if country.present? && country != 'USA'
  end
end
```

#### Backend Presenter
```ruby
# app/presenters/donor_presenter.rb (UPDATE)
def as_json(options = {})
  {
    id: object.id,
    name: object.name,
    email: object.email,
    displayable_email: displayable_email,
    phone: object.phone,                      # NEW
    address_line1: object.address_line1,      # NEW
    address_line2: object.address_line2,      # NEW
    city: object.city,                        # NEW
    state: object.state,                      # NEW
    zip_code: object.zip_code,                # NEW
    country: object.country,                  # NEW
    full_address: object.full_address,        # NEW (formatted)
    discarded_at: object.discarded_at,
    can_be_deleted: object.can_be_deleted?,
    last_donation_date: object.last_donation_date,
    created_at: object.created_at,
    updated_at: object.updated_at
  }
end
```

#### Backend Controller
```ruby
# app/controllers/api/donors_controller.rb (UPDATE create and update actions)

def create
  donor_params = params.require(:donor).permit(:name, :email, :phone, :address_line1, :address_line2, :city, :state, :zip_code, :country)
  result = DonorService.find_or_update_by_email(donor_params, Time.current)

  status = result[:created] ? :created : :ok
  render json: { donor: DonorPresenter.new(result[:donor]).as_json }, status: status
end

def update
  donor = Donor.find(params[:id])
  donor_params = params.require(:donor).permit(:name, :email, :phone, :address_line1, :address_line2, :city, :state, :zip_code, :country)

  # Update with current timestamp for date-based conflict resolution
  donor.update!(donor_params.merge(last_updated_at: Time.current))

  render json: { donor: DonorPresenter.new(donor).as_json }, status: :ok
end
```

#### Frontend TypeScript Type
```typescript
// src/types/donor.ts (UPDATE)
export interface Donor {
  id: number;
  name: string;
  email: string;
  displayable_email?: string | null;
  phone?: string | null;             // NEW
  address_line1?: string | null;     // NEW
  address_line2?: string | null;     // NEW
  city?: string | null;              // NEW
  state?: string | null;             // NEW
  zip_code?: string | null;          // NEW
  country?: string | null;           // NEW
  full_address?: string | null;      // NEW (formatted)
  discarded_at?: string | null;
  can_be_deleted?: boolean;
  last_donation_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DonorFormData {
  name: string;
  email: string;
  phone?: string;                    // NEW
  address_line1?: string;            // NEW
  address_line2?: string;            // NEW
  city?: string;                     // NEW
  state?: string;                    // NEW
  zip_code?: string;                 // NEW
  country?: string;                  // NEW
}
```

#### Frontend DonorForm
```tsx
// src/components/DonorForm.tsx (UPDATE)
import { useState, useEffect, FormEvent } from 'react';
import { TextField, Button, Stack, Autocomplete, Box } from '@mui/material';
import { Donor, DonorFormData } from '../types';
import { US_STATES } from '../constants/states';

interface DonorFormProps {
  donor?: Donor;
  initialName?: string;
  initialEmail?: string;
  onSubmit: (data: DonorFormData) => void;
  onCancel?: () => void;
}

function DonorForm({ donor, initialName = '', initialEmail = '', onSubmit, onCancel }: DonorFormProps) {
  const [name, setName] = useState(donor?.name || initialName);
  const [email, setEmail] = useState(donor?.email || initialEmail);
  const [phone, setPhone] = useState(donor?.phone || '');
  const [addressLine1, setAddressLine1] = useState(donor?.address_line1 || '');
  const [addressLine2, setAddressLine2] = useState(donor?.address_line2 || '');
  const [city, setCity] = useState(donor?.city || '');
  const [state, setState] = useState(donor?.state || '');
  const [zipCode, setZipCode] = useState(donor?.zip_code || '');
  const [country, setCountry] = useState(donor?.country || 'USA');

  // Update form when donor prop changes
  useEffect(() => {
    if (donor) {
      setName(donor.name);
      setEmail(donor.email);
      setPhone(donor.phone || '');
      setAddressLine1(donor.address_line1 || '');
      setAddressLine2(donor.address_line2 || '');
      setCity(donor.city || '');
      setState(donor.state || '');
      setZipCode(donor.zip_code || '');
      setCountry(donor.country || 'USA');
    } else {
      setName(initialName);
      setEmail(initialEmail);
      setPhone('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setZipCode('');
      setCountry('USA');
    }
  }, [donor, initialName, initialEmail]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      email,
      phone,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      state,
      zip_code: zipCode,
      country,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          fullWidth
          size="small"
        />
        <TextField
          label="Address Line 1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Address Line 2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          fullWidth
          size="small"
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
          />
          <Autocomplete
            value={state}
            onChange={(e, newValue) => setState(newValue || '')}
            options={US_STATES}
            renderInput={(params) => <TextField {...params} label="State" />}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Zip Code"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            inputProps={{ maxLength: 10 }}
          />
        </Box>
        <TextField
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          fullWidth
          size="small"
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          {donor ? 'Update' : 'Submit'}
        </Button>
        {donor && (
          <Button variant="outlined" color="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
        )}
      </Stack>
    </form>
  );
}

export default DonorForm;
```

#### Frontend DonorList
```tsx
// src/components/DonorList.tsx (UPDATE)
<Card key={donor.id}>
  <CardContent>
    <Typography variant="h6">{donor.name}</Typography>
    <Typography variant="body2" color="text.secondary">
      {donor.displayable_email || donor.email}
    </Typography>

    {/* NEW: Display Phone */}
    {donor.phone ? (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        📞 {donor.phone}
      </Typography>
    ) : (
      <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
        No phone
      </Typography>
    )}

    {/* NEW: Display Address */}
    {donor.full_address ? (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
        {donor.full_address}
      </Typography>
    ) : (
      <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
        No address
      </Typography>
    )}

    {/* Existing actions */}
  </CardContent>
</Card>
```

#### Constants File
```typescript
// src/constants/states.ts (NEW)
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];
```

### UX Design

**DonorForm with Address Fields:**
```
Create Donor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:  [John Doe                ]
Email: [john@example.com        ]

Address (Optional)
Address Line 1: [123 Main St   ]
Address Line 2: [Apt 4B         ]
City:      [San Francisco]  State: [CA▼]  Zip: [94102    ]
Country:   [USA                 ]

[Create Donor]
```

**DonorList Card with Address:**
```
┌────────────────────────────┐
│ John Doe                   │
│ john@example.com           │
│ 123 Main St                │
│ Apt 4B                     │
│ San Francisco CA 94102     │
│                            │
│ [Edit] [Archive]           │
└────────────────────────────┘
```

### Files to Create
**Backend:**
- `db/migrate/YYYYMMDDHHMMSS_add_phone_and_address_to_donors.rb` (NEW)

**Frontend:**
- `src/constants/states.ts` (NEW - US state codes)

### Files to Modify
**Backend:**
- `app/models/donor.rb` (add phone/address validations, full_address method, ransackable_attributes)
- `app/presenters/donor_presenter.rb` (add phone and address fields)
- `app/controllers/api/donors_controller.rb` (update permit params in create/update)
- `spec/models/donor_spec.rb` (add 9 tests)
- `spec/requests/api/donors_spec.rb` (add 2 tests)

**Frontend:**
- `src/types/donor.ts` (add phone and address fields to Donor and DonorFormData interfaces)
- `src/components/DonorForm.tsx` (add phone and address fields, ~80 lines)
- `src/components/DonorList.tsx` (display phone and address, ~20 lines)
- `src/components/DonorForm.test.tsx` (add 4 tests)
- `src/components/DonorList.test.tsx` (add 4 tests)
- `cypress/e2e/donor-management.cy.ts` (add 3 tests)

### Testing Strategy

**Backend RSpec (11 tests):**
1. Donor accepts valid phone (5551234567)
2. Donor accepts valid phone with formatting ((555) 123-4567, 555-123-4567)
3. Donor rejects invalid phone (123, ABC-DEF-GHIJ)
4. Donor phone is optional (allows blank)
5. Donor accepts valid zip code (12345)
6. Donor accepts valid zip code with dash (12345-6789)
7. Donor rejects invalid zip code (123, ABCDE)
8. Donor accepts valid state code (CA, NY)
9. Donor rejects invalid state code (California, XZ, 123)
10. full_address returns formatted address when all fields present
11. full_address handles missing optional fields

**Frontend Jest (8 tests):**
1. DonorForm renders phone and all address fields
2. DonorForm submits phone and address data with donor
3. DonorForm phone validation (client-side pattern)
4. DonorForm zip code validation (client-side pattern)
5. State autocomplete shows US states
6. DonorList displays phone when present
7. DonorList displays address when present
8. DonorList shows "No phone" / "No address" when missing

**Cypress E2E (3 tests):**
1. Create donor with full phone/address → verify saved → verify displayed in list
2. Edit existing donor to add phone/address → verify updated → verify displayed
3. Search for donor by phone number → verify found

### Address Format Examples

**Full Address:**
```
123 Main St
Apt 4B
San Francisco CA 94102
```

**Partial Address (City/State only):**
```
San Francisco CA
```

**International Address:**
```
10 Downing Street
London SW1A 2AA
United Kingdom
```

### Validation Rules

**Zip Code:**
- Optional (can be blank)
- Format: 5 digits OR 9 digits with dash
- Valid: `12345`, `12345-6789`
- Invalid: `123`, `ABCDE`, `12345-67`

**State:**
- Optional (can be blank)
- Format: 2-letter uppercase code
- Valid: `CA`, `NY`, `TX`
- Invalid: `California`, `ca`, `XZ`

**Country:**
- Optional (defaults to 'USA')
- Free text (for international flexibility)

### Estimated Time
- Backend migration + model: 1 hour
- Backend tests: 1.5 hours (11 tests)
- Frontend form + list: 2 hours (phone + address fields)
- Frontend tests: 1 hour (8 tests)
- E2E tests: 45 minutes (3 scenarios)
- **Total:** 6 hours

### Success Criteria
- [ ] Donors can be created with complete address information
- [ ] Address appears on donor list cards
- [ ] Address included in API responses (for reports/export)
- [ ] Zip code and state validation working
- [ ] Existing donors without address show "No address"
- [ ] All tests passing (RSpec + Jest + Cypress)

### Related Tickets
- TICKET-088: Donor Export to CSV/Excel (requires address field)
- TICKET-103: Monthly Donation Report (includes address)
- TICKET-104: Quarterly Donation Report (includes address)
- TICKET-105: Annual Donation Report (includes address)

### Implementation Summary

**Completed:** 2025-11-28

**What Was Built:**
1. ✅ Backend migration, validation (phonelib, validates_zipcode), full_address method
2. ✅ Ransack omni-search across name, email, phone, and all address fields
3. ✅ DonorService preservation logic (blank updates don't overwrite existing data)
4. ✅ DonorMergeService composite address field selection
5. ✅ Anonymous email generation from phone/address (prevents duplicate anonymous donors)
6. ✅ Stripe CSV import extracts phone and billing address
7. ✅ Frontend DonorForm, DonorList, DonorMergeModal with phone/address
8. ✅ Comprehensive test coverage (backend RSpec, frontend Jest, Cypress E2E)
9. ✅ Factory traits for testing (:with_phone, :with_address, :with_full_contact)

**Key Design Decisions:**
- **International support:** phonelib (global), validates_zipcode (233 countries), free-text state
- **Zip normalization:** 4-digit US codes auto-padded (6419 → 06419)
- **Anonymous donors:** Unique email per phone/address prevents collapse into single record
- **Search:** Ransack grouping syntax for OR across all fields
- **Merge:** Address treated as composite (all fields selected together)
- **Data preservation:** Blank CSV updates preserve existing phone/address

**Edge Cases Handled:**
- Phone/address added after anonymous donor created → Manual merge required
- Different formatting in CSV → Normalized on import
- Async donor loading in modal → useEffect initialization fix

### Notes
- **International Support:** Country field is free text to support non-US addresses
- **Optional Fields:** All address fields optional to support gradual data entry
- **Display Format:** Use `full_address` method for consistent formatting
- **Future Enhancement:** Add address validation service (USPS, Google Maps API)
- **Privacy:** Consider data retention policy for addresses
