## [TICKET-101] Donation Photo Upload (Check Images)

**Status:** 📋 Planned
**Priority:** 🔴 High
**Effort:** L (Large - 6-8 hours)
**Created:** 2025-11-12
**Dependencies:** TICKET-085 (Payment method tracking - for identifying check donations) ✅

### User Story
As a user, I want to upload photos of physical checks when recording check donations so that I have digital records for auditing and reconciliation.

### Problem Statement
**Current State:**
- No way to attach check images to donations
- Manual check tracking requires separate filing system
- Difficult to verify check amounts or donor information
- Cannot audit check donations without physical copies

**Desired State:**
- Required photo upload for check donations
- Optional photo upload for cash donations (receipt)
- Photos stored securely with donation record
- Photos viewable in donation list/details
- Photos downloadable for auditing

### Business Rules

**Photo Requirements:**
- **Check donations:** Photo REQUIRED (validation enforced)
- **Cash donations:** Photo OPTIONAL (receipt)
- **Online donations (Stripe):** Photo NOT allowed (no upload field shown)
- **File types:** JPG, PNG, HEIC (iPhone photos)
- **File size:** Max 5MB per photo
- **Multiple photos:** Support 1 photo per donation (future: multiple)

### Acceptance Criteria

#### Backend Changes
- [ ] Add migration for photo storage:
  - Add `photo_url` column to donations table (string, nullable)
  - Add `photo_filename` column (string, nullable)
  - Add `photo_content_type` column (string, nullable)
  - Add `photo_file_size` column (integer, nullable)

- [ ] Configure Active Storage:
  - Set up Active Storage for file uploads
  - Configure local storage for development
  - Add image processing gem (image_processing, mini_magick)
  - Generate thumbnails (200x200) for list view

- [ ] Update Donation model:
  - Add `has_one_attached :photo`
  - Validation: Photo required if payment_method is 'check'
  - Validation: Photo optional if payment_method is 'cash'
  - Validation: Photo not allowed if payment_method is 'online'
  - Validation: File type (image/jpeg, image/png, image/heic)
  - Validation: File size max 5MB
  - Add `photo_url` method to generate signed URL

- [ ] Update DonationsController:
  - Accept photo file in multipart/form-data
  - Attach photo to donation on create/update
  - Return photo URL in response

- [ ] Update DonationPresenter:
  - Include `photo_url` (signed URL, 1 hour expiry)
  - Include `photo_thumbnail_url` (signed URL for thumbnail)
  - Include `has_photo` boolean

- [ ] RSpec tests (12 new tests):
  - Model: Photo required for check donations
  - Model: Photo optional for cash donations
  - Model: Photo not allowed for online donations
  - Model: Accepts valid image types (jpg, png, heic)
  - Model: Rejects invalid file types (pdf, txt)
  - Model: Rejects files > 5MB
  - Model: photo_url returns signed URL
  - Controller: POST with photo attaches file
  - Controller: GET returns photo URL
  - Controller: DELETE donation removes photo
  - Presenter: Includes photo URLs
  - Presenter: has_photo is true when photo attached

#### Frontend Changes
- [ ] Update DonationForm:
  - Add photo upload field (conditionally shown)
  - Show upload field when payment_method is 'check' (REQUIRED)
  - Show upload field when payment_method is 'cash' (optional)
  - Hide upload field when payment_method is 'online'
  - File picker button with drag-and-drop
  - Image preview after selection
  - Clear/remove photo button
  - Validation error if check donation submitted without photo

- [ ] Update DonationList:
  - Show thumbnail icon if donation has photo
  - Clicking thumbnail opens full-size image in modal
  - Download button in modal

- [ ] Create PhotoUpload component (reusable):
  - File picker input
  - Drag-and-drop zone
  - Image preview
  - Remove button
  - File size/type validation
  - Loading state during upload

- [ ] Update TypeScript Donation interface:
  - Add `photo_url?: string | null`
  - Add `photo_thumbnail_url?: string | null`
  - Add `has_photo: boolean`

- [ ] Jest tests (8 new tests):
  - PhotoUpload component renders
  - PhotoUpload shows preview after file selected
  - PhotoUpload validates file type
  - PhotoUpload validates file size
  - DonationForm shows photo upload for check donations
  - DonationForm hides photo upload for online donations
  - DonationForm validation fails if check donation missing photo
  - DonationList shows thumbnail icon when has_photo=true

- [ ] Cypress E2E tests (3 scenarios):
  - Create check donation with photo → verify saved and thumbnail shown
  - Create check donation without photo → verify validation error
  - View donation thumbnail → click to open full image

### Technical Implementation

#### Backend - Active Storage Setup

**1. Install Active Storage:**
```bash
# Terminal commands
rails active_storage:install
rails db:migrate
```

**2. Configure Storage:**
```ruby
# config/storage.yml (UPDATE)
local:
  service: Disk
  root: <%= Rails.root.join("storage") %>

# For production (future):
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: us-west-2
  bucket: donation-tracker-production
```

```ruby
# config/environments/development.rb (UPDATE)
config.active_storage.service = :local
```

**3. Add Gems:**
```ruby
# Gemfile (ADD)
gem 'image_processing', '~> 1.12'  # For image thumbnails
gem 'mini_magick', '~> 4.11'       # ImageMagick wrapper
```

#### Backend Model
```ruby
# app/models/donation.rb (UPDATE)
class Donation < ApplicationRecord
  # ... existing code ...

  # Photo attachment
  has_one_attached :photo

  # Validations
  validate :photo_required_for_checks
  validate :photo_not_allowed_for_online
  validate :photo_file_type
  validate :photo_file_size

  # Photo URL with expiration
  def photo_url
    return nil unless photo.attached?
    Rails.application.routes.url_helpers.rails_blob_url(photo, expires_in: 1.hour)
  end

  # Thumbnail URL
  def photo_thumbnail_url
    return nil unless photo.attached?
    Rails.application.routes.url_helpers.rails_representation_url(
      photo.variant(resize_to_limit: [200, 200]),
      expires_in: 1.hour
    )
  end

  # Boolean helper
  def has_photo?
    photo.attached?
  end

  private

  def photo_required_for_checks
    if payment_method == 'check' && !photo.attached?
      errors.add(:photo, 'is required for check donations')
    end
  end

  def photo_not_allowed_for_online
    if payment_method == 'online' && photo.attached?
      errors.add(:photo, 'cannot be uploaded for online donations')
    end
  end

  def photo_file_type
    return unless photo.attached?

    allowed_types = ['image/jpeg', 'image/png', 'image/heic']
    unless allowed_types.include?(photo.content_type)
      errors.add(:photo, 'must be a JPG, PNG, or HEIC image')
    end
  end

  def photo_file_size
    return unless photo.attached?

    max_size = 5.megabytes
    if photo.byte_size > max_size
      errors.add(:photo, "must be less than #{max_size / 1.megabyte}MB")
    end
  end
end
```

#### Backend Controller
```ruby
# app/controllers/api/donations_controller.rb (UPDATE)
def create
  donation = Donation.new(donation_params)

  # Attach photo if provided
  if params[:photo].present?
    donation.photo.attach(params[:photo])
  end

  donation.save!

  render json: {
    donation: DonationPresenter.new(donation).as_json
  }, status: :created
end

def update
  donation = Donation.find(params[:id])

  # Update photo if provided
  if params[:photo].present?
    donation.photo.purge if donation.photo.attached?  # Remove old photo
    donation.photo.attach(params[:photo])
  end

  donation.update!(donation_params)

  render json: {
    donation: DonationPresenter.new(donation).as_json
  }
end

private

def donation_params
  params.require(:donation).permit(
    :amount,
    :date,
    :donor_id,
    :project_id,
    :sponsorship_id,
    :payment_method,
    :payment_source
    # Note: photo handled separately via params[:photo]
  )
end
```

#### Backend Presenter
```ruby
# app/presenters/donation_presenter.rb (UPDATE)
def as_json(options = {})
  {
    id: object.id,
    amount: object.amount,
    date: object.date,
    donor_name: object.donor&.name,
    project_title: object.project&.title,
    payment_method: object.payment_method,
    payment_source: object.payment_source,
    photo_url: object.photo_url,                    # NEW
    photo_thumbnail_url: object.photo_thumbnail_url, # NEW
    has_photo: object.has_photo?,                   # NEW
    created_at: object.created_at,
    # ... other fields
  }
end
```

#### Frontend - PhotoUpload Component
```tsx
// src/components/PhotoUpload.tsx (NEW)
import { useState } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import { CloudUpload, Delete } from '@mui/icons-material';

interface PhotoUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  helperText?: string;
}

const PhotoUpload = ({ value, onChange, required, helperText }: PhotoUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or HEIC image');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    onChange(file);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    setError(null);
  };

  return (
    <Box>
      {!preview ? (
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUpload />}
          fullWidth
        >
          Upload Photo {required && '*'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic"
            hidden
            onChange={handleFileChange}
          />
        </Button>
      ) : (
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={preview}
            alt="Check preview"
            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
          />
          <IconButton
            onClick={handleRemove}
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'white' }}
            size="small"
          >
            <Delete />
          </IconButton>
        </Box>
      )}

      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {helperText}
        </Typography>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default PhotoUpload;
```

#### Frontend - DonationForm Integration
```tsx
// src/components/DonationForm.tsx (UPDATE)
import PhotoUpload from './PhotoUpload';

const DonationForm = ({ onSubmit, initialData }: DonationFormProps) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [photo, setPhoto] = useState<File | null>(null);  // NEW

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Check donations require photo
    if (paymentMethod === 'check' && !photo) {
      alert('Photo is required for check donations');
      return;
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('donation[amount]', parseCurrency(amount).toString());
    formData.append('donation[date]', date);
    formData.append('donation[donor_id]', selectedDonor?.id.toString() || '');
    formData.append('donation[payment_method]', paymentMethod);

    if (photo) {
      formData.append('photo', photo);  // Attach photo
    }

    try {
      await apiClient.post('/api/donations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSubmit();
    } catch (error) {
      console.error('Failed to create donation:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Existing fields */}
      <TextField label="Amount" value={amount} onChange={...} />
      <DatePicker label="Date" value={date} onChange={...} />

      {/* Payment Method Selector */}
      <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
        <MenuItem value="online">Online</MenuItem>
        <MenuItem value="check">Check</MenuItem>
        <MenuItem value="cash">Cash</MenuItem>
      </Select>

      {/* Photo Upload (conditional) */}
      {(paymentMethod === 'check' || paymentMethod === 'cash') && (
        <PhotoUpload
          value={photo}
          onChange={setPhoto}
          required={paymentMethod === 'check'}
          helperText={
            paymentMethod === 'check'
              ? 'Photo of check is required'
              : 'Upload receipt (optional)'
          }
        />
      )}

      <Button type="submit" variant="contained" color="primary" fullWidth>
        Create Donation
      </Button>
    </Box>
  );
};
```

#### Frontend - DonationList Integration
```tsx
// src/components/DonationList.tsx (UPDATE)
import { PhotoCamera } from '@mui/icons-material';
import { Dialog } from '@mui/material';

const DonationList = ({ donations }: DonationListProps) => {
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const handlePhotoClick = (photoUrl: string) => {
    setSelectedPhotoUrl(photoUrl);
    setPhotoDialogOpen(true);
  };

  return (
    <>
      <Table>
        <TableBody>
          {donations.map((donation) => (
            <TableRow key={donation.id}>
              <TableCell>{donation.donor_name}</TableCell>
              <TableCell>{formatCurrency(donation.amount)}</TableCell>
              <TableCell>{donation.date}</TableCell>
              <TableCell>
                {donation.has_photo && (
                  <IconButton
                    size="small"
                    onClick={() => handlePhotoClick(donation.photo_url!)}
                  >
                    <PhotoCamera />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Photo Viewer Dialog */}
      <Dialog
        open={photoDialogOpen}
        onClose={() => setPhotoDialogOpen(false)}
        maxWidth="md"
      >
        {selectedPhotoUrl && (
          <img src={selectedPhotoUrl} alt="Check" style={{ width: '100%' }} />
        )}
      </Dialog>
    </>
  );
};
```

### UX Design

**DonationForm with Photo Upload (Check):**
```
Create Donation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount:   [$100.00              ]
Date:     [2025-11-12           ]
Donor:    [John Doe          ▼  ]
Method:   [Check              ▼  ]

┌────────────────────────────────┐
│ [Upload Photo *]               │
│                                │
│ Photo of check is required     │
└────────────────────────────────┘

[Create Donation]
```

**After Photo Selected:**
```
┌────────────────────────────────┐
│ [Check Image Preview]      [X] │
│ ┌──────────────────────────┐   │
│ │                          │   │
│ │   [Check Image]          │   │
│ │                          │   │
│ └──────────────────────────┘   │
└────────────────────────────────┘
```

**DonationList with Photo Icon:**
```
| Donor      | Amount   | Date       | Photo |
|------------|----------|------------|-------|
| John Doe   | $100.00  | 2025-11-12 | [📷]  |
| Jane Smith | $50.00   | 2025-11-11 |       |
```

### Files to Create

**Backend:**
- Active Storage migration (auto-generated by rails)
- `config/storage.yml` (configure storage)

**Frontend:**
- `src/components/PhotoUpload.tsx` (NEW - reusable upload component, ~120 lines)
- `src/components/PhotoUpload.test.tsx` (NEW - 4 tests)

### Files to Modify

**Backend:**
- `Gemfile` (add image_processing, mini_magick)
- `app/models/donation.rb` (add has_one_attached, validations)
- `app/controllers/api/donations_controller.rb` (handle photo upload)
- `app/presenters/donation_presenter.rb` (add photo URLs)
- `spec/models/donation_spec.rb` (add 6 tests)
- `spec/requests/api/donations_spec.rb` (add 6 tests)

**Frontend:**
- `src/types/donation.ts` (add photo fields)
- `src/components/DonationForm.tsx` (add PhotoUpload, FormData)
- `src/components/DonationList.tsx` (add thumbnail icon, photo dialog)
- `src/components/DonationForm.test.tsx` (add 4 tests)
- `cypress/e2e/donation-entry.cy.ts` (add 3 tests)

### Testing Strategy

**Backend RSpec (12 tests):**
1. Donation with check payment requires photo
2. Donation with cash payment allows optional photo
3. Donation with online payment rejects photo
4. Accepts valid image types (jpg, png, heic)
5. Rejects invalid file types (pdf, txt, docx)
6. Rejects files larger than 5MB
7. photo_url returns signed URL when attached
8. photo_url returns nil when no photo
9. POST /donations with photo attaches successfully
10. GET /donations includes photo URLs
11. DELETE /donations purges attached photo
12. DonationPresenter includes has_photo field

**Frontend Jest (8 tests):**
1. PhotoUpload component renders upload button
2. PhotoUpload shows preview after file selected
3. PhotoUpload validates file type and shows error
4. PhotoUpload validates file size and shows error
5. DonationForm shows photo upload for check payments
6. DonationForm hides photo upload for online payments
7. DonationForm prevents submit if check missing photo
8. DonationList shows camera icon when has_photo=true

**Cypress E2E (3 tests):**
1. Create check donation with photo → verify saved → verify thumbnail shown in list
2. Attempt to create check donation without photo → verify validation error
3. Click photo thumbnail in list → verify full image opens in modal

### Storage Considerations

**Development:**
- Use local disk storage (`storage/` directory)
- Photos stored in `storage/` (gitignored)
- Signed URLs expire after 1 hour

**Production (Future):**
- Migrate to AWS S3 or similar cloud storage
- Configure signed URLs with CDN
- Set up lifecycle policies for old photos
- Backup strategy for compliance

**Security:**
- Signed URLs prevent unauthorized access
- Photo URLs expire after 1 hour
- Only donation owner/admin can view photos
- Validate file types server-side (not just client)

### Performance Considerations

**Image Processing:**
- Generate thumbnails asynchronously (Active Job)
- Cache thumbnails for faster loading
- Use variant caching in Active Storage

**File Size:**
- 5MB limit prevents large uploads
- Consider image compression (future enhancement)
- Progressive JPEG loading for better UX

### Estimated Time
- Backend Active Storage setup: 1 hour
- Backend model validations: 1.5 hours
- Backend tests: 1.5 hours
- Frontend PhotoUpload component: 2 hours
- Frontend integration (form + list): 1.5 hours
- Frontend tests: 1.5 hours
- E2E tests: 1 hour
- **Total:** 10 hours

### Success Criteria
- [ ] Check donations require photo upload (validation enforced)
- [ ] Cash donations support optional photo upload
- [ ] Online donations do not show photo upload field
- [ ] Photos display as thumbnails in donation list
- [ ] Clicking thumbnail opens full-size image
- [ ] File type and size validation working
- [ ] All tests passing (RSpec + Jest + Cypress)
- [ ] Photos stored securely with expiring signed URLs

### Related Tickets
- TICKET-085: Payment Method Tracking ✅ (required for identifying check donations)
- TICKET-086: Delete Donation (should also delete associated photo)
- TICKET-102: Child Photo Upload (similar photo upload pattern)

### Notes
- **Compliance:** Check images may be required for tax/audit purposes (consult accountant)
- **Retention:** Consider data retention policy (e.g., keep check photos for 7 years)
- **Privacy:** Photos contain sensitive banking information - secure storage critical
- **Future Enhancement:** OCR to auto-extract check amount and verify against entered amount
- **Future Enhancement:** Support multiple photos per donation (front/back of check)
- **Mobile:** HEIC support enables iPhone photo uploads
