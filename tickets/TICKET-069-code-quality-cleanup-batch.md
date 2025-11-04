## [TICKET-069] Code Quality Cleanup (Batch)

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-31
**Dependencies:** None

### User Story
As a developer, I want to clean up minor code quality issues identified by linters so that the codebase has zero warnings and follows best practices consistently.

### Problem Statement

**Code Smells: 5 Minor Issues from Analysis**

This ticket batches together **5 small improvements** that are too minor for individual tickets but collectively improve code quality:

1. **Unused Ransack Parameters** (12 occurrences - Reek warning)
2. **Duplicate Method Calls** (10+ occurrences - Reek warning)
3. **Utility Functions in Instance Context** (2 occurrences - Reek warning)
4. **Prettier Formatting** (75+ violations - ESLint/Prettier)
5. **Missing Loading States** (3 pages - UX improvement)

**Impact:** Minor but cumulative - reduces noise in CI/CD, improves UX

### Acceptance Criteria

#### 1. Prefix Unused Ransack Parameters
- [ ] Update all `ransackable_attributes` methods to prefix unused parameter with `_`
- [ ] Update all `ransackable_associations` methods to prefix unused parameter with `_`
- [ ] Verify Reek warnings reduced (12 fewer warnings)

#### 2. Reduce Duplicate Method Calls
- [ ] Extract repeated `params[:include_sponsorships] == "true"` to local variable
- [ ] Extract repeated `params[:include_discarded] == "true"` to local variable
- [ ] Extract repeated `params[:child_id]` checks to local variable
- [ ] Verify Reek warnings reduced (5+ fewer warnings)

#### 3. Refactor Utility Functions
- [ ] Move `PaginationConcern#pagination_meta` to module method
- [ ] Keep instance method as wrapper (backwards compatible)
- [ ] Verify Reek warnings reduced (2 fewer warnings)

#### 4. Run Prettier Auto-Fix
- [ ] Run `npm run lint:fix` in frontend directory
- [ ] Commit formatted files
- [ ] Verify ESLint warnings reduced to 0

#### 5. Add Loading States to Pages
- [ ] Add `loading` state to `DonorsPage.tsx`
- [ ] Add `loading` state to `SponsorshipsPage.tsx`
- [ ] Add `loading` state to `ProjectsPage.tsx`
- [ ] Display `CircularProgress` when fetching data
- [ ] Hide content while loading

### Technical Approach

#### 1. Fix Unused Ransack Parameters

**Before:**
```ruby
def self.ransackable_attributes(auth_object = nil)
  ["name", "email"]
end

def self.ransackable_associations(auth_object = nil)
  ["donations", "sponsorships"]
end
```

**After:**
```ruby
def self.ransackable_attributes(_auth_object = nil)
  ["name", "email"]
end

def self.ransackable_associations(_auth_object = nil)
  ["donations", "sponsorships"]
end
```

**Files to Update (6 models):**
- `app/models/donor.rb`
- `app/models/donation.rb`
- `app/models/child.rb`
- `app/models/sponsorship.rb`
- `app/models/project.rb`
- `app/models/user.rb`

#### 2. Reduce Duplicate Method Calls

**Before:**
```ruby
# app/controllers/api/children_controller.rb
def index
  scope = params[:include_discarded] == "true" ? Child.with_discarded : Child.kept

  if params[:include_sponsorships] == "true"
    scope = scope.includes(sponsorships: :donor)
  end

  # ... later
  if params[:include_sponsorships] == "true"
    child_json[:sponsorships] = child.sponsorships.map { ... }
  end
end
```

**After:**
```ruby
def index
  include_discarded = params[:include_discarded] == "true"
  include_sponsorships = params[:include_sponsorships] == "true"

  scope = include_discarded ? Child.with_discarded : Child.kept
  scope = scope.includes(sponsorships: :donor) if include_sponsorships

  # ... later
  if include_sponsorships
    child_json[:sponsorships] = child.sponsorships.map { ... }
  end
end
```

**Files to Update (3 controllers):**
- `app/controllers/api/children_controller.rb`
- `app/controllers/api/sponsorships_controller.rb`
- `app/controllers/api/donations_controller.rb`

#### 3. Refactor Utility Functions

**Before:**
```ruby
# app/controllers/concerns/pagination_concern.rb
module PaginationConcern
  def pagination_meta(paginated_collection)
    {
      total_count: paginated_collection.total_count,
      total_pages: paginated_collection.total_pages,
      current_page: paginated_collection.current_page,
      per_page: paginated_collection.limit_value
    }
  end
end
```

**After:**
```ruby
module PaginationConcern
  extend ActiveSupport::Concern

  def pagination_meta(paginated_collection)
    PaginationConcern.build_meta(paginated_collection)
  end

  def self.build_meta(paginated_collection)
    {
      total_count: paginated_collection.total_count,
      total_pages: paginated_collection.total_pages,
      current_page: paginated_collection.current_page,
      per_page: paginated_collection.limit_value
    }
  end
end
```

**Files to Update:**
- `app/controllers/concerns/pagination_concern.rb`

#### 4. Run Prettier Auto-Fix

**Command:**
```bash
cd donation_tracker_frontend
npm run lint:fix
```

**Expected Changes:**
- Trailing commas added
- Line breaks adjusted
- Indentation standardized
- 75+ violations → 0

**Files Affected:**
- `src/api/client.ts` (~40 warnings)
- `src/api/client.test.ts` (~25 warnings)
- `src/components/*.test.tsx` (~10 warnings)
- Auto-fixed by Prettier

#### 5. Add Loading States to Pages

**DonorsPage.tsx:**
```typescript
const DonorsPage = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/donors', { params });
      setDonors(response.data.donors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {!loading && <DonorList donors={donors} />}
    </Box>
  );
};
```

**Files to Update:**
- `src/pages/DonorsPage.tsx`
- `src/pages/SponsorshipsPage.tsx`
- `src/pages/ProjectsPage.tsx`

**Note:** DonationsPage and ChildrenPage will use custom hooks with built-in loading (TICKET-062)

### Testing Strategy

#### Verify Reek Warnings Reduced

```bash
# Before
bundle exec reek app/ | grep -c "warning"
# Expected: ~48 warnings

# After
bundle exec reek app/ | grep -c "warning"
# Expected: ~25 warnings (23 fewer)
```

#### Verify ESLint Clean

```bash
# Before
npm run lint | grep -c "warning"
# Expected: ~75 warnings

# After
npm run lint
# Expected: 0 warnings
```

#### Verify All Tests Pass

```bash
bundle exec rspec
npm test
```

### Benefits

- ✅ **Cleaner CI/CD**: Zero linter warnings
- ✅ **Code Quality**: Follows best practices consistently
- ✅ **UX**: Loading states improve user experience
- ✅ **Maintainability**: Less noise when reviewing code
- ✅ **Professionalism**: Codebase appears well-maintained

### Files to Modify

**Backend (10 files):**
- `app/models/donor.rb` (unused param)
- `app/models/donation.rb` (unused param)
- `app/models/child.rb` (unused param)
- `app/models/sponsorship.rb` (unused param)
- `app/models/project.rb` (unused param)
- `app/models/user.rb` (unused param)
- `app/controllers/api/children_controller.rb` (duplicate calls)
- `app/controllers/api/sponsorships_controller.rb` (duplicate calls)
- `app/controllers/api/donations_controller.rb` (duplicate calls)
- `app/controllers/concerns/pagination_concern.rb` (utility function)

**Frontend (Auto-formatted by Prettier - ~15 files):**
- `src/api/client.ts`
- `src/api/client.test.ts`
- `src/components/*.test.tsx` (multiple files)
- Plus manual updates:
  - `src/pages/DonorsPage.tsx` (loading state)
  - `src/pages/SponsorshipsPage.tsx` (loading state)
  - `src/pages/ProjectsPage.tsx` (loading state)

### Checklist

- [ ] **Backend: Unused Parameters**
  - [ ] Update 6 models (Donor, Donation, Child, Sponsorship, Project, User)
  - [ ] Run `bundle exec reek app/models/` - verify 12 fewer warnings
- [ ] **Backend: Duplicate Calls**
  - [ ] Update 3 controllers (Children, Sponsorships, Donations)
  - [ ] Run `bundle exec reek app/controllers/` - verify 5 fewer warnings
- [ ] **Backend: Utility Functions**
  - [ ] Update PaginationConcern
  - [ ] Run `bundle exec reek app/controllers/concerns/` - verify 1 fewer warning
- [ ] **Frontend: Prettier**
  - [ ] Run `npm run lint:fix`
  - [ ] Commit formatted files
  - [ ] Run `npm run lint` - verify 0 warnings
- [ ] **Frontend: Loading States**
  - [ ] Add loading to DonorsPage
  - [ ] Add loading to SponsorshipsPage
  - [ ] Add loading to ProjectsPage
  - [ ] Test loading spinners manually
- [ ] **Tests**
  - [ ] Run `bundle exec rspec` - all pass
  - [ ] Run `npm test` - all pass

### Related Tickets
- Part of code quality improvement initiative (CODE_SMELL_ANALYSIS.md)
- TICKET-062: useChildren hook (includes loading state)
- TICKET-042: Class documentation (separate cleanup task)

### Notes
- Each sub-task can be done independently
- No functional changes - purely code quality
- Safe to batch together (low risk)
- Prettier changes may create large diff (auto-generated)
- Consider separate commit per sub-task for clean history

---

**Estimated Time:** 1-2 hours
- Unused parameters: 15 minutes (find/replace)
- Duplicate calls: 30 minutes
- Utility functions: 15 minutes
- Prettier auto-fix: 5 minutes
- Loading states: 30 minutes
- Testing & verification: 30 minutes
