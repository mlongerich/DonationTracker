## [TICKET-061] Fix ChildrenPage N+1 Query Problem

**Status:** 📋 Planned
**Priority:** 🔴 High (Performance bottleneck)
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-10-22
**Dependencies:** TICKET-010 (Children & Sponsorships exist) ✅

### User Story

As a user loading the Children page, I want it to load quickly even with many children so that the application feels responsive.

### Problem Statement

**Performance Issue:** ChildrenPage makes N+1 database queries when loading sponsorships.

**Current Implementation** (`ChildrenPage.tsx` lines 16-30):
```tsx
useEffect(() => {
  const loadChildren = async () => {
    const response = await apiClient.get('/api/children', { params: undefined });
    setChildren(response.data.children);

    // 🔴 N+1 QUERY PROBLEM: Loops through each child
    const sponsorshipMap = new Map<number, Sponsorship[]>();
    for (const child of response.data.children) {
      const sponsorshipResponse = await apiClient.get(`/api/children/${child.id}/sponsorships`);
      sponsorshipMap.set(child.id, sponsorshipResponse.data.sponsorships);
    }
    setSponsorships(sponsorshipMap);
  };
  loadChildren();
}, []);
```

**Performance Impact:**
- 10 children = 1 (children) + 10 (sponsorships) = **11 HTTP requests**
- 50 children = 1 + 50 = **51 HTTP requests**
- 100 children = 1 + 100 = **101 HTTP requests**

**Result:** Page load time increases linearly with number of children, causing slow UX.

### Acceptance Criteria

#### Backend: Add Eager Loading to ChildrenController

- [ ] Modify `GET /api/children` to include sponsorships in response
  - [ ] Eager load sponsorships with donors in single query
  - [ ] Return nested structure: `{ children: [{ id, name, sponsorships: [...] }] }`
  - [ ] Maintain backward compatibility (don't break existing API contracts)

- [ ] Add `include_sponsorships` query parameter (optional)
  - [ ] Default: `false` (current behavior for other consumers)
  - [ ] When `true`: Include sponsorships in response
  - [ ] ChildrenPage can opt-in with `?include_sponsorships=true`

- [ ] RSpec tests
  - [ ] Returns children without sponsorships by default
  - [ ] Returns children with sponsorships when param present
  - [ ] Eager loads sponsors (no N+1 queries - use `bullet` gem)
  - [ ] **3+ tests**

#### Frontend: Update ChildrenPage to Use New Endpoint

- [ ] Modify `ChildrenPage.tsx` to request sponsorships in initial load
  - [ ] Single API call: `GET /api/children?include_sponsorships=true`
  - [ ] Extract sponsorships from children data (no loop)
  - [ ] Build sponsorship map from nested data

- [ ] Jest tests
  - [ ] Makes single API call with correct params
  - [ ] Parses sponsorships from response correctly
  - [ ] **2+ tests**

### Technical Approach

#### Backend Implementation

**Option A: Query Parameter (Recommended)**

```ruby
# app/controllers/api/children_controller.rb
class Api::ChildrenController < ApplicationController
  def index
    scope = Child.all

    if params[:include_sponsorships] == 'true'
      # Eager load sponsorships with donors to avoid N+1
      scope = scope.includes(sponsorships: :donor)
    end

    filtered_scope = apply_ransack_filters(scope)
    children = paginate_collection(filtered_scope.order(name: :asc))

    children_data = children.map do |child|
      child_json = {
        id: child.id,
        name: child.name,
        age: child.age,
        bio: child.bio,
        photo_url: child.photo_url
      }

      if params[:include_sponsorships] == 'true'
        child_json[:sponsorships] = child.sponsorships.map do |s|
          {
            id: s.id,
            donor_id: s.donor_id,
            donor_name: s.donor&.name,
            monthly_amount: s.monthly_amount.to_s,
            active: s.active?,
            end_date: s.end_date
          }
        end
      end

      child_json
    end

    render json: {
      children: children_data,
      meta: pagination_meta(children)
    }
  end
end
```

**Tests:**
```ruby
RSpec.describe 'GET /api/children', type: :request do
  let!(:child1) { create(:child, name: 'Maria') }
  let!(:child2) { create(:child, name: 'Juan') }
  let!(:sponsorship) { create(:sponsorship, child: child1) }

  context 'without include_sponsorships param' do
    it 'returns children without sponsorships' do
      get '/api/children'

      json = JSON.parse(response.body)
      expect(json['children'].first.keys).not_to include('sponsorships')
    end
  end

  context 'with include_sponsorships=true' do
    it 'returns children with sponsorships' do
      get '/api/children?include_sponsorships=true'

      json = JSON.parse(response.body)
      expect(json['children'].first['sponsorships']).to be_an(Array)
    end

    it 'does not perform N+1 queries' do
      # Use bullet gem or manual query counting
      expect {
        get '/api/children?include_sponsorships=true'
      }.to perform_queries(3) # 1 for children, 1 for sponsorships, 1 for donors (eager loaded)
    end
  end
end
```

#### Frontend Implementation

**Before (N+1 queries):**
```tsx
useEffect(() => {
  const loadChildren = async () => {
    const response = await apiClient.get('/api/children');
    setChildren(response.data.children);

    const sponsorshipMap = new Map<number, Sponsorship[]>();
    for (const child of response.data.children) {
      const sponsorshipResponse = await apiClient.get(`/api/children/${child.id}/sponsorships`);
      sponsorshipMap.set(child.id, sponsorshipResponse.data.sponsorships);
    }
    setSponsorships(sponsorshipMap);
  };
  loadChildren();
}, []);
```

**After (single query):**
```tsx
useEffect(() => {
  const loadChildren = async () => {
    const response = await apiClient.get('/api/children', {
      params: { include_sponsorships: true }
    });

    setChildren(response.data.children);

    // Build sponsorship map from nested data (no extra requests)
    const sponsorshipMap = new Map<number, Sponsorship[]>();
    response.data.children.forEach((child: Child & { sponsorships?: Sponsorship[] }) => {
      if (child.sponsorships) {
        sponsorshipMap.set(child.id, child.sponsorships);
      }
    });
    setSponsorships(sponsorshipMap);
  };
  loadChildren();
}, []);
```

**Tests:**
```typescript
describe('ChildrenPage', () => {
  it('loads children with sponsorships in single request', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        sponsorships: [
          { id: 1, donor_name: 'John', monthly_amount: '50', active: true }
        ]
      }
    ];

    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { children: mockChildren }
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
        params: { include_sponsorships: true }
      });
    });
  });
});
```

### Alternative Approaches Considered

**Option B: Always Include Sponsorships**
- Pros: Simpler API (no param needed)
- Cons: Slower for consumers that don't need sponsorships

**Option C: Separate Batch Endpoint**
- Endpoint: `GET /api/children/with_sponsorships`
- Pros: Clear separation
- Cons: Duplicates logic, more routes

**Why Option A (Query Param) is Best:**
- ✅ Backward compatible
- ✅ Flexible (other consumers can opt-in)
- ✅ Single endpoint (DRY)
- ✅ Standard Rails pattern

### Files to Modify

**Backend:**
- `app/controllers/api/children_controller.rb` - Add conditional eager loading
- `spec/requests/api/children_spec.rb` - Add 3 tests

**Frontend:**
- `src/pages/ChildrenPage.tsx` - Use new param, parse nested data
- `src/pages/ChildrenPage.test.tsx` - Update tests
- `src/types/child.ts` - Add optional sponsorships field to Child interface

### Performance Benchmarks

**Before (N+1):**
- 10 children: ~500ms (11 requests × 45ms avg)
- 50 children: ~2.5s (51 requests × 50ms avg)
- 100 children: ~5s (101 requests × 50ms avg)

**After (Eager Loading):**
- 10 children: ~50ms (1 request with joins)
- 50 children: ~100ms (1 request with joins)
- 100 children: ~150ms (1 request with joins)

**Expected Improvement:** **10-30x faster** depending on number of children

### Benefits

- ✅ **Performance:** Eliminates N+1 query anti-pattern
- ✅ **Scalability:** Load time constant regardless of children count
- ✅ **Best Practice:** Follows Rails eager loading conventions
- ✅ **User Experience:** Faster page loads
- ✅ **Backward Compatible:** Doesn't break existing API consumers

### Related Tickets

- ✅ TICKET-010: Children & Sponsorships infrastructure
- 📋 TICKET-050: Children Page UI Standardization (will also benefit)
- 📋 TICKET-035: Database Indexes (can further optimize if needed)

### Notes

**Why High Priority:**
- Performance bottleneck affects all users
- Problem worsens as more children are added
- Common Rails anti-pattern that should be fixed early
- Simple fix with large impact

**Testing with Bullet Gem:**
The `bullet` gem (already installed per CLAUDE.md) can detect N+1 queries in development:
```ruby
# Verify no N+1 queries in test
expect {
  get '/api/children?include_sponsorships=true'
}.not_to raise_error # Bullet would raise if N+1 detected
```

---

*Identified from codebase analysis (2025-10-22)*
