## [TICKET-100] Add Physical Address to Donor Records

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours)
**Created:** 2025-11-12
**Dependencies:** None

### User Story
As a user, I want to store physical addresses for donors so that I can generate mailing lists for tax receipts, newsletters, and generate comprehensive donor reports.

### Problem Statement
**Current State:**
- Donor records only store name and email
- Cannot send physical mail or tax receipts
- Export functionality (TICKET-088) expects address field but it doesn't exist
- Reports (TICKET-103, TICKET-104, TICKET-105) require address data

**Desired State:**
- Donors have complete address information (street, city, state, zip)
- Address appears in donor list cards
- Address included in donor export (CSV)
- Address available for donor reports

### Acceptance Criteria

#### Backend Changes
- [ ] Add migration to add address fields to donors table:
  - `address_line1` (string, optional)
  - `address_line2` (string, optional, nullable)
  - `city` (string, optional)
  - `state` (string, optional)
  - `zip_code` (string, optional)
  - `country` (string, optional, default: 'USA')

- [ ] Update Donor model:
  - Validation: zip_code format (5 or 9 digits with optional dash)
  - Validation: state is 2-letter code if provided
  - Add `full_address` method to format complete address

- [ ] Update DonorPresenter to include address fields

- [ ] RSpec tests (8 new tests):
  - Model: Accepts valid US zip codes (12345, 12345-6789)
  - Model: Rejects invalid zip codes
  - Model: Accepts valid state codes (CA, NY, TX)
  - Model: Rejects invalid state codes (California, XZ)
  - Model: full_address returns formatted string
  - Model: full_address handles missing fields gracefully
  - Presenter: Includes all address fields
  - Request: POST/PUT endpoints accept address fields

#### Frontend Changes
- [ ] Update DonorForm:
  - Add address_line1 TextField (optional)
  - Add address_line2 TextField (optional)
  - Add city TextField (optional)
  - Add state TextField with autocomplete (US states)
  - Add zip_code TextField with mask (optional)
  - Add country TextField (default: 'USA', optional)

- [ ] Update DonorList cards:
  - Display formatted address below email
  - Show "No address" if address fields empty
  - Use muted text color for address

- [ ] Update TypeScript Donor interface:
  - Add all address fields

- [ ] Jest tests (6 new tests):
  - DonorForm renders address fields
  - DonorForm submits address data
  - DonorForm validates zip code format
  - DonorList displays address when present
  - DonorList shows "No address" when missing
  - State autocomplete shows US states

- [ ] Cypress E2E tests (2 scenarios):
  - Create donor with full address → verify saved and displayed
  - Edit donor to add address → verify updated

### Technical Implementation

#### Backend Migration
```ruby
# db/migrate/YYYYMMDDHHMMSS_add_address_to_donors.rb
class AddAddressToDonors < ActiveRecord::Migration[7.0]
  def change
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
    address_line1: object.address_line1,      # NEW
    address_line2: object.address_line2,      # NEW
    city: object.city,                        # NEW
    state: object.state,                      # NEW
    zip_code: object.zip_code,                # NEW
    country: object.country,                  # NEW
    full_address: object.full_address,        # NEW (formatted)
    # ... other fields
  }
end
```

#### Backend Controller
```ruby
# app/controllers/api/donors_controller.rb (UPDATE)
def donor_params
  params.require(:donor).permit(
    :name,
    :email,
    :address_line1,    # NEW
    :address_line2,    # NEW
    :city,             # NEW
    :state,            # NEW
    :zip_code,         # NEW
    :country           # NEW
  )
end
```

#### Frontend TypeScript Type
```typescript
// src/types/donor.ts (UPDATE)
export interface Donor {
  id: number;
  name: string;
  email: string;
  address_line1?: string | null;     // NEW
  address_line2?: string | null;     // NEW
  city?: string | null;              // NEW
  state?: string | null;             // NEW
  zip_code?: string | null;          // NEW
  country?: string | null;           // NEW
  full_address?: string | null;      // NEW (formatted)
  discarded_at?: string | null;
  last_donation_date?: string | null;
}
```

#### Frontend DonorForm
```tsx
// src/components/DonorForm.tsx (UPDATE)
import { US_STATES } from '../constants/states';

const DonorForm = ({ onSubmit, initialData }: DonorFormProps) => {
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [addressLine1, setAddressLine1] = useState(initialData?.address_line1 || '');
  const [addressLine2, setAddressLine2] = useState(initialData?.address_line2 || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [zipCode, setZipCode] = useState(initialData?.zip_code || '');
  const [country, setCountry] = useState(initialData?.country || 'USA');

  // ... existing code ...

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Existing name and email fields */}
      <TextField label="Name" value={name} onChange={...} />
      <TextField label="Email" value={email} onChange={...} />

      {/* Address Section */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Address (Optional)
      </Typography>

      <TextField
        label="Address Line 1"
        value={addressLine1}
        onChange={(e) => setAddressLine1(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      <TextField
        label="Address Line 2"
        value={addressLine2}
        onChange={(e) => setAddressLine2(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      {/* Existing submit button */}
      <Button type="submit" variant="contained" color="primary" fullWidth>
        {initialData ? 'Update' : 'Create'}
      </Button>
    </Box>
  );
};
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

    {/* NEW: Display Address */}
    {donor.full_address ? (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
        {donor.full_address}
      </Typography>
    ) : (
      <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
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
- `db/migrate/YYYYMMDDHHMMSS_add_address_to_donors.rb` (NEW)

**Frontend:**
- `src/constants/states.ts` (NEW - US state codes)

### Files to Modify
**Backend:**
- `app/models/donor.rb` (add validations and full_address method)
- `app/presenters/donor_presenter.rb` (add address fields)
- `app/controllers/api/donors_controller.rb` (update donor_params)
- `spec/models/donor_spec.rb` (add 6 tests)
- `spec/requests/api/donors_spec.rb` (add 2 tests)

**Frontend:**
- `src/types/donor.ts` (add address fields)
- `src/components/DonorForm.tsx` (add address fields, ~40 lines)
- `src/components/DonorList.tsx` (display address, ~10 lines)
- `src/components/DonorForm.test.tsx` (add 3 tests)
- `src/components/DonorList.test.tsx` (add 3 tests)
- `cypress/e2e/donor-management.cy.ts` (add 2 tests)

### Testing Strategy

**Backend RSpec (8 tests):**
1. Donor accepts valid zip code (12345)
2. Donor accepts valid zip code with dash (12345-6789)
3. Donor rejects invalid zip code (123, ABCDE)
4. Donor accepts valid state code (CA, NY)
5. Donor rejects invalid state code (California, XZ, 123)
6. full_address returns formatted address when all fields present
7. full_address handles missing optional fields
8. DonorPresenter includes all address fields

**Frontend Jest (6 tests):**
1. DonorForm renders all address fields
2. DonorForm submits address data with donor
3. State autocomplete shows US states
4. DonorList displays address when present
5. DonorList shows "No address" when missing
6. Address displayed in multi-line format

**Cypress E2E (2 tests):**
1. Create donor with full address → verify saved → verify displayed in list
2. Edit existing donor to add address → verify updated → verify displayed

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
- Backend tests: 1 hour
- Frontend form + list: 1.5 hours
- Frontend tests: 1 hour
- E2E tests: 30 minutes
- **Total:** 5 hours

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

### Notes
- **International Support:** Country field is free text to support non-US addresses
- **Optional Fields:** All address fields optional to support gradual data entry
- **Display Format:** Use `full_address` method for consistent formatting
- **Future Enhancement:** Add address validation service (USPS, Google Maps API)
- **Privacy:** Consider data retention policy for addresses
