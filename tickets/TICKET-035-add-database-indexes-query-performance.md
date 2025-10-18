## [TICKET-035] Add Database Indexes for Query Performance

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small)
**Created:** 2025-10-18
**Dependencies:** None

### User Story
As a user, I want donation queries to execute quickly even with large datasets so that the application remains responsive as data grows.

### Problem Statement
Several columns are frequently queried but lack database indexes:
- `donations.date` - Filtered in date range queries, ordered by date DESC
- `donations.status` - Potentially filtered (if used in future queries)
- `donations.created_at` - Useful for recent donations queries

**Performance Issue:** Missing indexes on filtered/sorted columns
**Impact:** Slow queries as donation table grows (full table scans)

### Acceptance Criteria
- [ ] Add index on `donations.date` column
- [ ] Add index on `donations.status` column
- [ ] Add index on `donations.created_at` column (if beneficial)
- [ ] Run query performance benchmarks before and after
- [ ] Document query performance improvements
- [ ] All existing tests pass
- [ ] Update CLAUDE.md with indexing strategy

### Technical Approach

#### 1. Create Migration for Indexes

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_performance_indexes_to_donations.rb
class AddPerformanceIndexesToDonations < ActiveRecord::Migration[8.0]
  def change
    # Index for date filtering and ordering
    # Used in: DonationList date range filters, default ordering
    add_index :donations, :date, name: 'index_donations_on_date'

    # Index for status filtering (if used)
    # Future-proofing for status-based queries
    add_index :donations, :status, name: 'index_donations_on_status'

    # Composite index for common query pattern: donor + date
    # Optimizes queries like "donations for a donor in a date range"
    add_index :donations, [:donor_id, :date], name: 'index_donations_on_donor_id_and_date'
  end
end
```

#### 2. Run Migration

```bash
rails db:migrate
```

#### 3. Verify Indexes in Schema

```ruby
# db/schema.rb (after migration)
create_table "donations", force: :cascade do |t|
  t.decimal "amount"
  t.date "date"
  t.bigint "donor_id", null: false
  t.string "status"
  t.text "description"
  t.datetime "created_at", null: false
  t.datetime "updated_at", null: false

  t.index ["date"], name: "index_donations_on_date"
  t.index ["donor_id"], name: "index_donations_on_donor_id"
  t.index ["donor_id", "date"], name: "index_donations_on_donor_id_and_date"
  t.index ["status"], name: "index_donations_on_status"
end
```

### Query Performance Analysis

#### Queries to Optimize

**1. Date Range Filtering** (DonationList component):
```sql
-- Before index:
SELECT * FROM donations
WHERE date >= '2024-01-01' AND date <= '2024-12-31'
ORDER BY date DESC;
-- Performance: Full table scan

-- After index on (date):
-- Performance: Index range scan
```

**2. Donor Donations with Date Filter**:
```sql
-- Before composite index:
SELECT * FROM donations
WHERE donor_id = 123 AND date >= '2024-01-01'
ORDER BY date DESC;
-- Performance: Index scan on donor_id, then filter

-- After composite index on (donor_id, date):
-- Performance: Composite index range scan (faster)
```

**3. Status Filtering** (future queries):
```sql
-- Future query:
SELECT * FROM donations WHERE status = 'completed';
-- Performance: Index scan instead of full table scan
```

### Benchmarking Strategy

```ruby
# lib/tasks/benchmark_queries.rake
namespace :benchmark do
  desc "Benchmark donation queries"
  task donation_queries: :environment do
    require 'benchmark'

    # Create test data if needed
    unless Donation.count > 1000
      puts "Creating test data..."
      donor = Donor.first || Donor.create!(name: "Test", email: "test@example.com")
      1000.times do |i|
        Donation.create!(
          donor: donor,
          amount: rand(10.0..500.0),
          date: Date.today - rand(365).days,
          status: ['pending', 'completed', 'failed'].sample
        )
      end
    end

    puts "\n=== Donation Query Benchmarks ==="
    puts "Total donations: #{Donation.count}\n\n"

    # Benchmark 1: Date range query
    Benchmark.bm(30) do |x|
      x.report("Date range filter:") do
        100.times do
          Donation.where(date: 30.days.ago..Date.today).order(date: :desc).load
        end
      end
    end

    # Benchmark 2: Donor + date range query
    donor_id = Donor.first.id
    Benchmark.bm(30) do |x|
      x.report("Donor + date filter:") do
        100.times do
          Donation.where(donor_id: donor_id, date: 30.days.ago..Date.today)
                  .order(date: :desc).load
        end
      end
    end

    # Benchmark 3: Status filter
    Benchmark.bm(30) do |x|
      x.report("Status filter:") do
        100.times do
          Donation.where(status: 'completed').load
        end
      end
    end

    puts "\n=== Query Plans ==="
    puts "\nDate range query EXPLAIN:"
    puts Donation.where(date: 30.days.ago..Date.today).explain

    puts "\nDonor + date query EXPLAIN:"
    puts Donation.where(donor_id: donor_id, date: 30.days.ago..Date.today).explain
  end
end
```

### Running Benchmarks

```bash
# Before adding indexes
rails benchmark:donation_queries > benchmarks/before_indexes.txt

# Add indexes
rails db:migrate

# After adding indexes
rails benchmark:donation_queries > benchmarks/after_indexes.txt

# Compare results
diff benchmarks/before_indexes.txt benchmarks/after_indexes.txt
```

### Expected Performance Improvements

| Query Type | Before | After | Improvement |
|------------|--------|-------|-------------|
| Date range (10k rows) | 50ms | 5ms | 10x faster |
| Donor + date (10k rows) | 30ms | 3ms | 10x faster |
| Status filter (10k rows) | 40ms | 4ms | 10x faster |

*Note: Actual performance depends on data size and distribution*

### Index Trade-offs

**Pros:**
- Faster SELECT queries on indexed columns
- Faster ORDER BY on indexed columns
- Faster WHERE clause evaluation

**Cons:**
- Slower INSERTs (index must be updated)
- Slower UPDATEs on indexed columns
- Additional disk space (typically small)

**For this application:**
- ✅ Read-heavy workload (donation history browsing)
- ✅ Infrequent writes (donations created occasionally)
- ✅ Performance gain >> write overhead

### Monitoring Query Performance

```ruby
# config/initializers/query_logging.rb (development only)
if Rails.env.development?
  ActiveRecord::Base.logger = Logger.new(STDOUT)
  ActiveRecord::Base.verbose_query_logs = true

  # Log slow queries
  ActiveSupport::Notifications.subscribe('sql.active_record') do |name, start, finish, id, payload|
    duration = (finish - start) * 1000
    if duration > 100 # Log queries > 100ms
      Rails.logger.warn("SLOW QUERY (#{duration.round(2)}ms): #{payload[:sql]}")
    end
  end
end
```

### Files to Create
- `db/migrate/YYYYMMDDHHMMSS_add_performance_indexes_to_donations.rb` (NEW)
- `lib/tasks/benchmark_queries.rake` (NEW)
- `benchmarks/before_indexes.txt` (NEW - gitignored)
- `benchmarks/after_indexes.txt` (NEW - gitignored)

### Files to Modify
- `db/schema.rb` (AUTO-UPDATED by migration)
- `.gitignore` (ADD benchmarks/ directory)
- `CLAUDE.md` (UPDATE - add indexing strategy)

### Index Naming Convention

Follow Rails conventions:
- Single column: `index_table_on_column`
- Multiple columns: `index_table_on_column1_and_column2`
- Unique index: `index_table_on_column (unique: true)`

### Future Index Considerations

**Partial Indexes** (when needed):
```ruby
# Index only non-null status values
add_index :donations, :status, where: "status IS NOT NULL"

# Index only recent donations
add_index :donations, :date, where: "date > '2024-01-01'"
```

**Full-text Search Indexes** (if implementing search):
```ruby
# PostgreSQL full-text search
add_index :donations, :description, using: :gin, opclass: :gin_trgm_ops
```

### Testing Strategy

```ruby
# spec/db/indexes_spec.rb
RSpec.describe "Database Indexes" do
  it "has index on donations.date" do
    expect(ActiveRecord::Base.connection.index_exists?(
      :donations, :date
    )).to be true
  end

  it "has index on donations.status" do
    expect(ActiveRecord::Base.connection.index_exists?(
      :donations, :status
    )).to be true
  end

  it "has composite index on donations (donor_id, date)" do
    expect(ActiveRecord::Base.connection.index_exists?(
      :donations, [:donor_id, :date]
    )).to be true
  end
end
```

### Benefits
- **Performance**: 10x faster queries on large datasets
- **Scalability**: Application remains responsive as data grows
- **User Experience**: Faster page loads, smoother filtering
- **Cost Efficiency**: Reduces database CPU usage
- **Future-Proofing**: Ready for larger datasets

### Related Tickets
- Works well with TICKET-034 (Query Objects - faster queries)
- Part of performance optimization initiative

### Notes
- Indexes are automatically used by PostgreSQL query planner
- Monitor index usage with `pg_stat_user_indexes` in production
- Remove unused indexes to save space and write overhead
- Consider adding indexes to other frequently queried columns as usage patterns emerge
- Test on production-sized dataset if possible before deploying
