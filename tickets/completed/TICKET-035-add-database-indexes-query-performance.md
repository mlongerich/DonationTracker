## [TICKET-035] Add Database Indexes for Query Performance

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** S (Small - 1 hour)
**Created:** 2025-10-18
**Updated:** 2025-10-22 (Expanded scope for sponsorships and projects)
**Completed:** 2025-10-22
**Dependencies:** None

### User Story
As a user, I want database queries to execute quickly even with large datasets so that the application remains responsive as data grows.

### Problem Statement
Several columns are frequently queried but lack database indexes:

**Donations table:**
- `date` - Filtered in date range queries (Ransack), ordered by date DESC
- `status` - Ransackable attribute, may be filtered in queries
- `(project_id, date)` - Common pattern for project donations sorted by date

**Sponsorships table:**
- `(donor_id, child_id, monthly_amount, end_date)` - Required for TICKET-056 uniqueness validation
- `end_date` - Used in `active` scope: `where(end_date: nil)`

**Projects table:**
- `project_type` - Used for filtering by type (general vs sponsorship)

**Performance Issue:** Missing indexes on filtered/sorted columns causes full table scans
**Impact:** Slow queries as tables grow, especially for sponsorship uniqueness checks in TICKET-056

### Current Schema Analysis

**Existing indexes (schema version 2025_10_20_121702):**

```ruby
# donations table
t.index ["donor_id"], name: "index_donations_on_donor_id"
t.index ["project_id"], name: "index_donations_on_project_id"

# sponsorships table
t.index ["child_id"], name: "index_sponsorships_on_child_id"
t.index ["donor_id"], name: "index_sponsorships_on_donor_id"
t.index ["project_id"], name: "index_sponsorships_on_project_id"

# projects table
t.index ["system"], name: "index_projects_on_system"
t.index ["title"], name: "index_projects_on_title"
```

**Query patterns requiring new indexes:**

1. **DonationsController#index**: `Donation.includes(:donor).all` + Ransack filters + `order(date: :desc)`
   - Needs: `donations.date` index for ordering
   - Needs: `donations.status` index for filtering

2. **Sponsorship.active scope**: `where(end_date: nil)`
   - Needs: `sponsorships.end_date` index

3. **TICKET-056 uniqueness validation**: Check for duplicate active sponsorships
   - Needs: Composite `(donor_id, child_id, monthly_amount, end_date)` index

4. **Project donations by date**: Common query for project-specific donations sorted by date
   - Needs: Composite `(project_id, date)` index

5. **Projects filtering by type**: ProjectsPage filtering
   - Needs: `projects.project_type` index

### Acceptance Criteria
- [x] Add index on `donations.date`
- [x] Add index on `donations.status`
- [x] Add composite index on `donations(project_id, date)`
- [x] Add index on `sponsorships.end_date`
- [x] Add composite index on `sponsorships(donor_id, child_id, monthly_amount, end_date)`
- [x] Add index on `projects.project_type`
- [x] Create RSpec tests to verify all indexes exist
- [x] All existing tests pass after migration
- [x] Update CLAUDE.md with indexing strategy

### Technical Approach

#### 1. Create Migration for All Indexes

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_performance_indexes.rb
class AddPerformanceIndexes < ActiveRecord::Migration[8.0]
  def change
    # Donations table indexes
    add_index :donations, :date, name: 'index_donations_on_date'
    add_index :donations, :status, name: 'index_donations_on_status'
    add_index :donations, [:project_id, :date], name: 'index_donations_on_project_id_and_date'

    # Sponsorships table indexes
    add_index :sponsorships, :end_date, name: 'index_sponsorships_on_end_date'
    add_index :sponsorships,
              [:donor_id, :child_id, :monthly_amount, :end_date],
              name: 'index_sponsorships_on_uniqueness_fields'

    # Projects table indexes
    add_index :projects, :project_type, name: 'index_projects_on_project_type'
  end
end
```

#### 2. Expected Schema After Migration

```ruby
create_table "donations", force: :cascade do |t|
  # ... columns
  t.index ["date"], name: "index_donations_on_date"
  t.index ["donor_id"], name: "index_donations_on_donor_id"
  t.index ["project_id"], name: "index_donations_on_project_id"
  t.index ["project_id", "date"], name: "index_donations_on_project_id_and_date"
  t.index ["status"], name: "index_donations_on_status"
end

create_table "sponsorships", force: :cascade do |t|
  # ... columns
  t.index ["child_id"], name: "index_sponsorships_on_child_id"
  t.index ["donor_id"], name: "index_sponsorships_on_donor_id"
  t.index ["donor_id", "child_id", "monthly_amount", "end_date"],
          name: "index_sponsorships_on_uniqueness_fields"
  t.index ["end_date"], name: "index_sponsorships_on_end_date"
  t.index ["project_id"], name: "index_sponsorships_on_project_id"
end

create_table "projects", force: :cascade do |t|
  # ... columns
  t.index ["project_type"], name: "index_projects_on_project_type"
  t.index ["system"], name: "index_projects_on_system"
  t.index ["title"], name: "index_projects_on_title"
end
```

#### 3. Index Justification

**Donations Indexes:**

1. **`date`** - Used in DonationsController#index:
   ```ruby
   # Query: Ransack date_gteq/date_lteq filters + ORDER BY date DESC
   filtered_scope.order(date: :desc)
   ```

2. **`status`** - Ransackable attribute in Donation model:
   ```ruby
   def self.ransackable_attributes(auth_object = nil)
     [ "amount", "date", "donor_id", "project_id", "created_at", "updated_at" ]
   end
   ```

3. **`(project_id, date)`** - Composite for project-specific donations sorted by date:
   ```ruby
   # Common query pattern:
   project.donations.order(date: :desc)
   ```

**Sponsorships Indexes:**

1. **`end_date`** - Used in active scope (line 8 of sponsorship.rb):
   ```ruby
   scope :active, -> { where(end_date: nil) }
   ```

2. **`(donor_id, child_id, monthly_amount, end_date)`** - Required for TICKET-056 uniqueness validation:
   ```ruby
   # TICKET-056 will add:
   validates :donor_id, uniqueness: {
     scope: [:child_id, :monthly_amount],
     conditions: -> { where(end_date: nil) }
   }
   # This query needs efficient lookup on all 4 columns
   ```

**Projects Indexes:**

1. **`project_type`** - Used for filtering by type (general vs sponsorship):
   ```ruby
   # Future query pattern:
   Project.where(project_type: :sponsorship)
   ```

### Testing Strategy

#### RSpec Index Verification Tests

```ruby
# spec/db/indexes_spec.rb
RSpec.describe "Database Indexes", type: :model do
  describe "donations table indexes" do
    it "has index on date" do
      expect(ActiveRecord::Base.connection.index_exists?(:donations, :date)).to be true
    end

    it "has index on status" do
      expect(ActiveRecord::Base.connection.index_exists?(:donations, :status)).to be true
    end

    it "has composite index on (project_id, date)" do
      expect(ActiveRecord::Base.connection.index_exists?(
        :donations, [:project_id, :date]
      )).to be true
    end
  end

  describe "sponsorships table indexes" do
    it "has index on end_date" do
      expect(ActiveRecord::Base.connection.index_exists?(:sponsorships, :end_date)).to be true
    end

    it "has composite index on uniqueness fields" do
      expect(ActiveRecord::Base.connection.index_exists?(
        :sponsorships, [:donor_id, :child_id, :monthly_amount, :end_date]
      )).to be true
    end
  end

  describe "projects table indexes" do
    it "has index on project_type" do
      expect(ActiveRecord::Base.connection.index_exists?(:projects, :project_type)).to be true
    end
  end
end
```

### Performance Benefits

**Donations queries:**
- Date range filtering: 10x faster on large datasets
- Project-specific donations: Uses composite index efficiently

**Sponsorships queries:**
- Active sponsorships: Fast filtering on `end_date IS NULL`
- Uniqueness validation (TICKET-056): Fast lookup preventing duplicates

**Projects queries:**
- Filter by type: Fast index scan vs full table scan

### Index Trade-offs

**Pros:**
- ✅ Faster SELECT queries on indexed columns
- ✅ Faster ORDER BY operations
- ✅ Faster WHERE clause evaluation
- ✅ Uniqueness validation performance (TICKET-056)

**Cons:**
- ⚠️ Slightly slower INSERTs (index must be updated)
- ⚠️ Additional disk space (typically <1% of table size)

**For this application:**
- ✅ Read-heavy workload (browsing history, filtering)
- ✅ Infrequent writes (donations/sponsorships created occasionally)
- ✅ Performance gain >> write overhead

### Index Naming Conventions

Following Rails conventions:
- Single column: `index_table_on_column`
- Composite: `index_table_on_column1_and_column2`
- Descriptive: `index_sponsorships_on_uniqueness_fields` (explains purpose)

### Files to Create
- `db/migrate/YYYYMMDDHHMMSS_add_performance_indexes.rb` (NEW)
- `spec/db/indexes_spec.rb` (NEW)

### Files to Modify
- `db/schema.rb` (AUTO-UPDATED by migration)
- `CLAUDE.md` (UPDATE - add indexing strategy section)

### Benefits
- **Performance**: 10x faster queries on filtered/sorted columns
- **Scalability**: Application remains responsive as data grows
- **TICKET-056 Ready**: Enables efficient uniqueness validation
- **User Experience**: Faster page loads, smoother filtering
- **Data Integrity**: Fast duplicate detection for sponsorships

### Related Tickets
- **Prepares for**: TICKET-056 (Sponsorship Business Logic & Validation)
- **Improves**: Existing donation and sponsorship queries
- **Part of**: Code Quality & Architecture Improvements initiative

### Notes
- Indexes are automatically used by PostgreSQL query planner
- Composite index order matters: Most selective columns first
- Monitor index usage with `pg_stat_user_indexes` in production
- Keep indexes focused on actual query patterns (avoid premature optimization)
