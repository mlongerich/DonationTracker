## [TICKET-049] Child Model Soft Delete with Archive/Restore

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Started:** TBD
**Completed:** TBD
**Dependencies:** None
**Blocked by:** None

### User Story
As an admin, I want to archive children instead of permanently deleting them so that I can restore them if needed and maintain historical records, consistent with how donor archiving works.

### Acceptance Criteria
- [ ] Child model uses Discard gem for soft delete functionality
- [ ] Migration adds `discarded_at` timestamp column to children table
- [ ] DELETE `/api/children/:id` soft deletes (sets discarded_at timestamp)
- [ ] GET `/api/children` endpoint excludes archived children by default
- [ ] GET `/api/children` includes archived when `include_discarded=true` param present
- [ ] POST `/api/children/:id/restore` endpoint to unarchive children
- [ ] DELETE `/api/children/all` endpoint for test cleanup (hard delete all)
- [ ] RSpec model tests for soft delete behavior
- [ ] RSpec request tests for archive/restore endpoints
- [ ] Ransack includes discarded_at in searchable attributes
- [ ] Factory Bot updated to support creating archived children for tests

### Technical Notes
- **Pattern Consistency**: Follow exact pattern from TICKET-001 (Donor soft delete)
- **Discard Gem**: Already in Gemfile, just need to include in Child model
- **Controller Pattern**: Use `PaginationConcern` and `RansackFilterable` concerns
- **Test Strategy**: Mirror donor archive tests (`spec/models/donor_spec.rb`, `spec/requests/api/donors_spec.rb`)
- **Cascade Behavior**: Verify sponsorship relationships are preserved when child is archived
- **Data Integrity**: Archived children should retain all sponsorship history

### Backend Implementation Checklist
- [ ] Add `include Discard::Model` to `app/models/child.rb`
- [ ] Create migration `add_discarded_at_to_children`
- [ ] Update `app/controllers/api/children_controller.rb`:
  - [ ] Add `include PaginationConcern` and `include RansackFilterable`
  - [ ] Modify `index` to use `apply_ransack_filters` and `paginate_collection`
  - [ ] Modify `destroy` to call `discard` instead of `destroy`
  - [ ] Add `restore` action
  - [ ] Add `destroy_all` action for test cleanup
- [ ] Update `config/routes.rb`:
  - [ ] Add `post :restore, on: :member`
  - [ ] Add `delete :all, on: :collection`
- [ ] Add RSpec model tests in `spec/models/child_spec.rb`:
  - [ ] Test soft delete sets discarded_at
  - [ ] Test default scope excludes discarded
  - [ ] Test kept scope excludes discarded
  - [ ] Test discarded scope includes only discarded
  - [ ] Test with_discarded scope includes all
- [ ] Add RSpec request tests in `spec/requests/api/children_spec.rb`:
  - [ ] Test DELETE archives child
  - [ ] Test GET excludes archived by default
  - [ ] Test GET includes archived with param
  - [ ] Test POST restore unarchives child
  - [ ] Test DELETE /all hard deletes for tests
- [ ] Update Factory Bot in `spec/factories/children.rb`:
  - [ ] Add `discarded` trait

### Files to Change
- `donation_tracker_api/app/models/child.rb`
- `donation_tracker_api/app/controllers/api/children_controller.rb`
- `donation_tracker_api/config/routes.rb`
- `donation_tracker_api/db/migrate/YYYYMMDDHHMMSS_add_discarded_at_to_children.rb` (new)
- `donation_tracker_api/spec/models/child_spec.rb`
- `donation_tracker_api/spec/requests/api/children_spec.rb`
- `donation_tracker_api/spec/factories/children.rb`

### Testing Strategy
1. **Model Tests**: Verify Discard gem behavior (scopes, timestamps)
2. **Request Tests**: Verify API endpoints return correct data
3. **Factory Tests**: Ensure discarded trait works for test data
4. **Integration**: Manual testing with archived children and sponsorships

### Related Commits
- TBD

### Reference Tickets
- TICKET-001: Donor soft delete pattern to follow
- TICKET-050: Frontend UI ticket (depends on this ticket)
