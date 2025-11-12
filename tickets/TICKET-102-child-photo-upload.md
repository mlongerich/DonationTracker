## [TICKET-102] Child Photo Upload

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 4-5 hours)
**Created:** 2025-11-12
**Dependencies:** TICKET-101 (Photo upload pattern) - can reuse PhotoUpload component

### User Story
As a user, I want to upload photos for sponsored children so that donors can see who they're supporting and build personal connections.

### Problem Statement
**Current State:**
- Child records have no photo field
- Cannot show child photos to donors
- Difficult to identify children visually
- Less personal connection for sponsors

**Desired State:**
- Each child can have a profile photo
- Photos display in child list cards
- Photos shown in autocomplete dropdowns (future enhancement)
- Photos visible in sponsorship management
- Photos included in donor communications (future)

### Business Rules

**Photo Requirements:**
- **Optional:** Photos not required (some children may not have photos)
- **File types:** JPG, PNG, HEIC
- **File size:** Max 5MB per photo
- **Privacy:** Consider data privacy for child photos (consult legal)
- **One photo per child:** Primary photo only (future: photo gallery)

### Acceptance Criteria

#### Backend Changes
- [ ] Update Child model:
  - Add `has_one_attached :photo` (Active Storage)
  - Validation: File type (image/jpeg, image/png, image/heic)
  - Validation: File size max 5MB
  - Add `photo_url` method (signed URL, 1 hour expiry)
  - Add `photo_thumbnail_url` method (200x200 variant)

- [ ] Update ChildrenController:
  - Accept photo file in multipart/form-data
  - Attach photo on create/update
  - Purge old photo when updating

- [ ] Update ChildPresenter:
  - Include `photo_url` (signed URL)
  - Include `photo_thumbnail_url` (thumbnail)
  - Include `has_photo` boolean

- [ ] RSpec tests (8 new tests):
  - Model: Accepts valid image types
  - Model: Rejects invalid file types
  - Model: Rejects files > 5MB
  - Model: photo_url returns signed URL when attached
  - Model: photo_url returns nil when no photo
  - Controller: POST with photo attaches file
  - Presenter: Includes photo URLs
  - Presenter: has_photo field accurate

#### Frontend Changes
- [ ] Update ChildForm:
  - Add PhotoUpload component (reuse from TICKET-101)
  - Optional photo field
  - Preview uploaded photo
  - Remove photo button

- [ ] Update ChildList:
  - Display child photo in card (if present)
  - Show placeholder avatar if no photo
  - Photo thumbnail (100x100) with rounded corners
  - Clicking photo opens full-size in modal

- [ ] Update TypeScript Child interface:
  - Add `photo_url?: string | null`
  - Add `photo_thumbnail_url?: string | null`
  - Add `has_photo: boolean`

- [ ] Jest tests (6 new tests):
  - ChildForm renders photo upload field
  - ChildForm submits photo with child data
  - ChildList displays photo when present
  - ChildList shows placeholder when no photo
  - Clicking photo opens modal
  - PhotoUpload validates file type/size

- [ ] Cypress E2E tests (2 scenarios):
  - Create child with photo → verify saved and displayed
  - Edit child to add photo → verify updated

### Technical Implementation

#### Backend Model
```ruby
# app/models/child.rb (UPDATE)
class Child < ApplicationRecord
  # ... existing code ...

  # Photo attachment
  has_one_attached :photo

  # Validations
  validate :photo_file_type
  validate :photo_file_size

  # Photo URLs
  def photo_url
    return nil unless photo.attached?
    Rails.application.routes.url_helpers.rails_blob_url(photo, expires_in: 1.hour)
  end

  def photo_thumbnail_url
    return nil unless photo.attached?
    Rails.application.routes.url_helpers.rails_representation_url(
      photo.variant(resize_to_limit: [200, 200]),
      expires_in: 1.hour
    )
  end

  def has_photo?
    photo.attached?
  end

  private

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
# app/controllers/api/children_controller.rb (UPDATE)
def create
  child = Child.new(child_params)

  # Attach photo if provided
  if params[:photo].present?
    child.photo.attach(params[:photo])
  end

  child.save!

  render json: {
    child: ChildPresenter.new(child).as_json
  }, status: :created
end

def update
  child = Child.find(params[:id])

  # Update photo if provided
  if params[:photo].present?
    child.photo.purge if child.photo.attached?  # Remove old photo
    child.photo.attach(params[:photo])
  end

  child.update!(child_params)

  render json: {
    child: ChildPresenter.new(child).as_json
  }
end

private

def child_params
  params.require(:child).permit(:name, :gender)
  # Note: photo handled separately
end
```

#### Backend Presenter
```ruby
# app/presenters/child_presenter.rb (UPDATE)
def as_json(options = {})
  {
    id: object.id,
    name: object.name,
    gender: object.gender,
    photo_url: object.photo_url,                    # NEW
    photo_thumbnail_url: object.photo_thumbnail_url, # NEW
    has_photo: object.has_photo?,                   # NEW
    # ... other fields
  }
end
```

#### Frontend - ChildForm Integration
```tsx
// src/components/ChildForm.tsx (UPDATE)
import PhotoUpload from './PhotoUpload';  // Reuse from TICKET-101

const ChildForm = ({ onSubmit, initialData }: ChildFormProps) => {
  const [name, setName] = useState(initialData?.name || '');
  const [gender, setGender] = useState(initialData?.gender || '');
  const [photo, setPhoto] = useState<File | null>(null);  // NEW

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('child[name]', name);
    if (gender) formData.append('child[gender]', gender);

    if (photo) {
      formData.append('photo', photo);  // Attach photo
    }

    try {
      if (initialData) {
        await apiClient.put(`/api/children/${initialData.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await apiClient.post('/api/children', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      onSubmit();
    } catch (error) {
      console.error('Failed to save child:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        fullWidth
        required
        sx={{ mb: 2 }}
      />

      <Select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      >
        <MenuItem value="">Not specified</MenuItem>
        <MenuItem value="boy">Boy</MenuItem>
        <MenuItem value="girl">Girl</MenuItem>
      </Select>

      {/* Photo Upload */}
      <PhotoUpload
        value={photo}
        onChange={setPhoto}
        required={false}
        helperText="Upload child photo (optional)"
      />

      <Button type="submit" variant="contained" color="primary" fullWidth>
        {initialData ? 'Update' : 'Create'}
      </Button>
    </Box>
  );
};
```

#### Frontend - ChildList Integration
```tsx
// src/components/ChildList.tsx (UPDATE)
import { Avatar, Dialog } from '@mui/material';
import { Person } from '@mui/icons-material';

const ChildList = ({ children }: ChildListProps) => {
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const handlePhotoClick = (photoUrl: string) => {
    setSelectedPhotoUrl(photoUrl);
    setPhotoDialogOpen(true);
  };

  return (
    <>
      {children.map((child) => (
        <Card key={child.id}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Child Photo */}
            <Avatar
              src={child.photo_thumbnail_url || undefined}
              alt={child.name}
              sx={{ width: 100, height: 100, cursor: child.has_photo ? 'pointer' : 'default' }}
              onClick={() => child.has_photo && handlePhotoClick(child.photo_url!)}
            >
              {!child.has_photo && <Person sx={{ fontSize: 50 }} />}
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">{child.name}</Typography>
              {child.gender && (
                <Typography variant="body2" color="text.secondary">
                  {child.gender === 'boy' ? 'Boy' : 'Girl'}
                </Typography>
              )}
              {/* Existing sponsorship info */}
            </Box>

            {/* Existing action buttons */}
          </CardContent>
        </Card>
      ))}

      {/* Photo Viewer Dialog */}
      <Dialog
        open={photoDialogOpen}
        onClose={() => setPhotoDialogOpen(false)}
        maxWidth="md"
      >
        {selectedPhotoUrl && (
          <img src={selectedPhotoUrl} alt="Child" style={{ width: '100%' }} />
        )}
      </Dialog>
    </>
  );
};
```

### UX Design

**ChildForm with Photo Upload:**
```
Create Child
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:   [Sangwan                ]
Gender: [Boy                 ▼  ]

┌────────────────────────────────┐
│ [Upload Photo]                 │
│                                │
│ Upload child photo (optional)  │
└────────────────────────────────┘

[Create Child]
```

**ChildList Card with Photo:**
```
┌────────────────────────────────┐
│  ┌──────┐                      │
│  │      │  Sangwan              │
│  │ [👤] │  Boy                  │
│  │      │  Sponsored by:        │
│  └──────┘  John Doe ($25/mo)   │
│                                 │
│  [Edit] [Archive]               │
└────────────────────────────────┘
```

**With Photo:**
```
┌────────────────────────────────┐
│  ┌──────┐                      │
│  │[IMG] │  Sangwan              │
│  │      │  Boy                  │
│  │      │  Sponsored by:        │
│  └──────┘  John Doe ($25/mo)   │
│     ↑                           │
│  Clickable                      │
└────────────────────────────────┘
```

### Files to Modify

**Backend:**
- `app/models/child.rb` (add has_one_attached, validations)
- `app/controllers/api/children_controller.rb` (handle photo upload)
- `app/presenters/child_presenter.rb` (add photo URLs)
- `spec/models/child_spec.rb` (add 5 tests)
- `spec/requests/api/children_spec.rb` (add 3 tests)

**Frontend:**
- `src/types/child.ts` (add photo fields)
- `src/components/ChildForm.tsx` (add PhotoUpload, FormData)
- `src/components/ChildList.tsx` (add avatar, photo dialog)
- `src/components/ChildForm.test.tsx` (add 3 tests)
- `src/components/ChildList.test.tsx` (add 3 tests)
- `cypress/e2e/child-management.cy.ts` (add 2 tests)

### Testing Strategy

**Backend RSpec (8 tests):**
1. Child accepts valid image types (jpg, png, heic)
2. Child rejects invalid file types
3. Child rejects files > 5MB
4. photo_url returns signed URL when attached
5. photo_url returns nil when no photo
6. POST /children with photo attaches successfully
7. ChildPresenter includes photo URLs
8. has_photo field accurate

**Frontend Jest (6 tests):**
1. ChildForm renders photo upload field
2. ChildForm submits photo with child data
3. ChildList displays photo when present
4. ChildList shows placeholder avatar when no photo
5. Clicking photo opens modal with full image
6. PhotoUpload component validates file

**Cypress E2E (2 tests):**
1. Create child with photo → verify saved → verify displayed in list
2. Edit child to add photo → verify updated and displayed

### Privacy & Legal Considerations

**Child Photo Privacy:**
- **Age Verification:** Ensure proper consent for child photos
- **Parental Consent:** May require parental/guardian consent forms
- **Data Protection:** COPPA (US), GDPR (EU) compliance for child data
- **Usage Rights:** Clarify photo usage rights (donor communications, website, etc.)
- **Retention Policy:** Define how long photos are kept
- **Access Control:** Limit who can view child photos (future: admin-only)

**Recommendations:**
- Consult legal counsel before implementing
- Add consent tracking to Child model (future enhancement)
- Consider age-appropriate photo guidelines
- Implement photo approval workflow (future)

### Estimated Time
- Backend model + validations: 1 hour
- Backend controller + presenter: 1 hour
- Backend tests: 1.5 hours
- Frontend form integration: 1 hour
- Frontend list integration: 1 hour
- Frontend tests: 1.5 hours
- E2E tests: 1 hour
- **Total:** 8 hours

### Success Criteria
- [ ] Children can have profile photos (optional)
- [ ] Photos display in child list cards
- [ ] Placeholder avatar shown when no photo
- [ ] Clicking photo opens full-size view
- [ ] File type and size validation working
- [ ] All tests passing (RSpec + Jest + Cypress)
- [ ] Photos stored securely with expiring signed URLs

### Related Tickets
- TICKET-101: Donation Photo Upload ✅ (PhotoUpload component reused)
- TICKET-059: Child Info Display (could include photo in future)
- TICKET-008: Authentication (future: restrict photo access to authenticated users)

### Notes
- **Privacy First:** Consult legal before implementing child photo features
- **Reuse Code:** PhotoUpload component from TICKET-101 can be reused
- **Future Enhancement:** Show child photo in autocomplete dropdown
- **Future Enhancement:** Photo gallery (multiple photos per child)
- **Future Enhancement:** Photo approval workflow (admin approval required)
- **Future Enhancement:** Consent tracking (link photo to signed consent form)
- **Mobile Friendly:** HEIC support enables iPhone photo uploads
