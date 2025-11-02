## [TICKET-027] Stripe Description Mapping Management

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-070 (provides "UNMAPPED: {description}" projects to manage)
**Updated:** 2025-11-02

### User Story
As an admin, I want to create flexible mapping rules for Stripe donation descriptions so that I can handle naming convention changes, map multiple descriptions to one project, and receive notifications when unknown descriptions appear, all without requiring code changes.

### Context
TICKET-070 (Stripe CSV Import) creates the foundation by importing ALL donations with these patterns:
- "Monthly Sponsorship Donation for {Child}" → Sponsorship project
- "$X - General Monthly Donation" → General Donation project
- "Donation for Campaign {ID}" → Campaign {ID} project
- **All other descriptions** → "UNMAPPED: {description}" project

This ticket provides admin tools to bulk remap "UNMAPPED: ..." projects to proper projects without code changes.

### Acceptance Criteria
- [ ] Backend: StripeDescriptionMapping model (pattern, match_type, project, project_title, project_type, child_name, priority, active)
- [ ] Backend: UnmappedDonation queue model (stripe_charge_id, description, amount, customer_email, customer_name, status, notes)
- [ ] Backend: Mapping rule matching engine (exact, contains, regex)
- [ ] Backend: Priority-based rule evaluation (higher priority checked first)
- [ ] Backend: Update StripeDonationImportService to use mapping table
- [ ] Backend: Queue unmapped donations when no rule matches
- [ ] Backend: Email notification when unmapped donation detected
- [ ] Backend: Bulk retry endpoint (re-process unmapped donations after new rules)
- [ ] Backend: RSpec tests for mapping engine (12+ tests)
- [ ] Backend: RSpec tests for priority ordering
- [ ] Backend: RSpec tests for regex pattern matching
- [ ] Frontend: Mapping rules management page (list, create, edit, delete)
- [ ] Frontend: Unmapped donations review queue dashboard
- [ ] Frontend: Quick mapping actions (map to existing project, create new project)
- [ ] Frontend: Bulk retry button (re-process all unmapped donations)
- [ ] Frontend: Show mapping rule preview (test pattern against sample descriptions)
- [ ] Cypress E2E test for creating mapping rule
- [ ] Cypress E2E test for reviewing and mapping unmapped donation

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Problem solved**: Stripe description changes don't break imports
- **Use cases**:
  1. "Pan monthly donation" → "Monthly recurring donation for Pan" (naming change)
  2. "Building Fund" + "New Building Campaign" → Same project (multiple titles)
  3. "Special Christmas Appeal" → No rule exists → Queue + notify admin

**Database Schema:**

```ruby
# Migration 1: StripeDescriptionMappings
rails g model StripeDescriptionMapping \
  pattern:string \
  match_type:string \
  project:references \
  project_title:string \
  project_type:integer \
  child_name:string \
  priority:integer \
  active:boolean

# app/models/stripe_description_mapping.rb
class StripeDescriptionMapping < ApplicationRecord
  belongs_to :project, optional: true

  enum match_type: { exact: 0, contains: 1, regex: 2 }
  enum project_type: { general: 0, campaign: 1, sponsorship: 2 }

  validates :pattern, presence: true
  validates :match_type, presence: true
  validates :priority, numericality: { only_integer: true }

  # Prevent deletion of active mappings with linked donations
  before_destroy :check_if_safe_to_delete

  scope :active, -> { where(active: true) }
  scope :by_priority, -> { order(priority: :desc) }

  def matches?(description)
    case match_type
    when 'exact'
      description == pattern
    when 'contains'
      description.include?(pattern)
    when 'regex'
      description.match?(Regexp.new(pattern, Regexp::IGNORECASE))
    end
  end

  def extract_child_name(description)
    return child_name unless child_name&.include?('$1')

    # Replace $1 with regex capture group
    if match_type == 'regex' && description.match(Regexp.new(pattern, Regexp::IGNORECASE))
      child_name.gsub('$1', $1)
    else
      child_name
    end
  end
end

# Migration 2: UnmappedDonations
rails g model UnmappedDonation \
  stripe_charge_id:string \
  description:string \
  amount:decimal \
  customer_email:string \
  customer_name:string \
  stripe_created_at:datetime \
  status:string \
  donation:references \
  notes:text

# app/models/unmapped_donation.rb
class UnmappedDonation < ApplicationRecord
  belongs_to :donation, optional: true

  enum status: { pending: 0, reviewed: 1, imported: 2, ignored: 3 }

  validates :stripe_charge_id, presence: true, uniqueness: true
  validates :description, presence: true

  scope :pending, -> { where(status: :pending) }
  scope :recent, -> { order(stripe_created_at: :desc) }
end
```

**Updated Import Service:**

```ruby
# app/services/stripe_donation_import_service.rb
class StripeDonationImportService
  def import
    return if already_imported?

    mapping = find_mapping_rule(@data[:description])

    if mapping.nil?
      queue_for_manual_review
      return nil
    end

    # Apply mapping...
  end

  private

  def find_mapping_rule(description)
    StripeDescriptionMapping.active.by_priority.find do |rule|
      rule.matches?(description)
    end
  end

  def queue_for_manual_review
    unmapped = UnmappedDonation.find_or_create_by(stripe_charge_id: @data[:charge_id]) do |u|
      u.description = @data[:description]
      u.amount = @data[:amount] / 100.0
      u.customer_email = @data[:customer_email]
      u.customer_name = @data[:customer_name]
      u.stripe_created_at = @data[:created_at]
      u.status = :pending
    end

    # Send notification
    AdminNotificationMailer.unmapped_donation(unmapped).deliver_later
  end
end
```

**Email Notification:**

```ruby
# app/mailers/admin_notification_mailer.rb
class AdminNotificationMailer < ApplicationMailer
  def unmapped_donation(unmapped_donation)
    @unmapped = unmapped_donation
    mail(
      to: ENV['ADMIN_EMAIL'],
      subject: "New Unmapped Donation from Stripe: #{@unmapped.description}"
    )
  end
end

# app/views/admin_notification_mailer/unmapped_donation.html.erb
<h2>New Unmapped Donation Received</h2>

<p>A donation with an unrecognized description was received from Stripe:</p>

<ul>
  <li><strong>Description:</strong> <%= @unmapped.description %></li>
  <li><strong>Amount:</strong> <%= number_to_currency(@unmapped.amount) %></li>
  <li><strong>Donor:</strong> <%= @unmapped.customer_name %> (<%= @unmapped.customer_email %>)</li>
  <li><strong>Date:</strong> <%= @unmapped.stripe_created_at.strftime('%B %d, %Y') %></li>
</ul>

<p>
  <%= link_to 'Review and Map Donation', admin_unmapped_donations_url, style: 'background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;' %>
</p>
```

**Admin API Endpoints:**

```ruby
# config/routes.rb
namespace :api do
  namespace :admin do
    resources :stripe_description_mappings
    resources :unmapped_donations do
      collection do
        post :bulk_retry
      end
      member do
        post :map_to_project
        post :ignore
      end
    end
  end
end

# app/controllers/api/admin/unmapped_donations_controller.rb
class Api::Admin::UnmappedDonationsController < ApplicationController
  def index
    @unmapped = UnmappedDonation.pending.recent.page(params[:page])
    render json: @unmapped
  end

  def map_to_project
    unmapped = UnmappedDonation.find(params[:id])
    project = Project.find(params[:project_id])

    # Import donation with specified project
    stripe_data = build_stripe_data(unmapped)
    donation = create_donation_for_unmapped(stripe_data, project)

    unmapped.update!(status: :imported, donation: donation)

    # Optionally create mapping rule
    if params[:create_mapping_rule]
      StripeDescriptionMapping.create!(
        pattern: unmapped.description,
        match_type: :exact,
        project: project,
        priority: 10,
        active: true
      )
    end

    render json: { success: true, donation: donation }
  end

  def bulk_retry
    # Re-process all pending unmapped donations
    unmapped_donations = UnmappedDonation.pending
    imported_count = 0

    unmapped_donations.each do |unmapped|
      stripe_data = build_stripe_data(unmapped)
      donation = StripeDonationImportService.new(stripe_data).import

      if donation
        unmapped.update!(status: :imported, donation: donation)
        imported_count += 1
      end
    end

    render json: { imported: imported_count, remaining: UnmappedDonation.pending.count }
  end
end
```

**Frontend: Mapping Rules Management**

```typescript
// src/components/admin/StripeMappingRules.tsx
interface MappingRule {
  id: number;
  pattern: string;
  match_type: 'exact' | 'contains' | 'regex';
  project_title: string;
  project_type: 'general' | 'campaign' | 'sponsorship';
  child_name?: string;
  priority: number;
  active: boolean;
}

export function StripeMappingRules() {
  const [rules, setRules] = useState<MappingRule[]>([]);
  const [testDescription, setTestDescription] = useState('');

  const testPattern = (pattern: string, matchType: string) => {
    // Preview which rule would match
    const matches = rules.filter(rule => {
      switch (matchType) {
        case 'exact': return testDescription === pattern;
        case 'contains': return testDescription.includes(pattern);
        case 'regex': return new RegExp(pattern, 'i').test(testDescription);
      }
    });
    return matches;
  };

  return (
    <div>
      <h2>Stripe Description Mapping Rules</h2>

      {/* Rule tester */}
      <div className="rule-tester">
        <input
          placeholder="Test description..."
          value={testDescription}
          onChange={e => setTestDescription(e.target.value)}
        />
        <p>Matches: {testPattern()}</p>
      </div>

      {/* Rules table */}
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Pattern</th>
            <th>Match Type</th>
            <th>Project</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(rule => (
            <tr key={rule.id}>
              <td>{rule.priority}</td>
              <td>{rule.pattern}</td>
              <td>{rule.match_type}</td>
              <td>{rule.project_title}</td>
              <td>{rule.active ? '✓' : '✗'}</td>
              <td>
                <button onClick={() => editRule(rule)}>Edit</button>
                <button onClick={() => deleteRule(rule.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Frontend: Unmapped Queue Dashboard**

```typescript
// src/components/admin/UnmappedDonationsQueue.tsx
interface UnmappedDonation {
  id: number;
  description: string;
  amount: number;
  customer_email: string;
  customer_name: string;
  stripe_created_at: string;
}

export function UnmappedDonationsQueue() {
  const [unmapped, setUnmapped] = useState<UnmappedDonation[]>([]);

  const mapToProject = async (id: number, projectId: number, createRule: boolean) => {
    await api.post(`/api/admin/unmapped_donations/${id}/map_to_project`, {
      project_id: projectId,
      create_mapping_rule: createRule
    });
    // Reload queue
    fetchUnmapped();
  };

  const bulkRetry = async () => {
    const result = await api.post('/api/admin/unmapped_donations/bulk_retry');
    alert(`Imported ${result.imported} donations. ${result.remaining} remaining.`);
    fetchUnmapped();
  };

  return (
    <div>
      <h2>Unmapped Donations Queue</h2>
      <button onClick={bulkRetry}>Retry All with New Rules</button>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
            <th>Donor</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {unmapped.map(donation => (
            <tr key={donation.id}>
              <td>{donation.description}</td>
              <td>${donation.amount}</td>
              <td>{donation.customer_name} ({donation.customer_email})</td>
              <td>{new Date(donation.stripe_created_at).toLocaleDateString()}</td>
              <td>
                <ProjectSelector
                  onSelect={(projectId, createRule) =>
                    mapToProject(donation.id, projectId, createRule)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Example Mapping Rules:**

```ruby
# Multiple titles → One project
StripeDescriptionMapping.create!([
  { pattern: "Building Fund", match_type: :contains, project_title: "Building Fund", project_type: :campaign, priority: 10 },
  { pattern: "New Building Campaign", match_type: :contains, project_title: "Building Fund", project_type: :campaign, priority: 10 },
  { pattern: "Construction Donation", match_type: :contains, project_title: "Building Fund", project_type: :campaign, priority: 10 }
])

# Sponsorship naming variations
StripeDescriptionMapping.create!([
  { pattern: "Pan monthly donation", match_type: :exact, project_title: "Sponsor Pan", project_type: :sponsorship, child_name: "Pan", priority: 20 },
  { pattern: "Monthly recurring donation for Pan", match_type: :exact, project_title: "Sponsor Pan", project_type: :sponsorship, child_name: "Pan", priority: 20 }
])

# Regex pattern for all sponsorships
StripeDescriptionMapping.create!(
  pattern: 'sponsorship.*for\s+(\w+)',
  match_type: :regex,
  project_title: 'Sponsor $1',
  project_type: :sponsorship,
  child_name: '$1',
  priority: 15
)
```

**Testing Strategy:**
1. Unit tests: Pattern matching (exact, contains, regex)
2. Unit tests: Priority ordering (higher priority wins)
3. Integration tests: Unmapped donation queueing
4. Integration tests: Bulk retry after new rule creation
5. Email tests: Notification sent when unmapped detected
6. E2E tests: Admin creates rule, imports previously unmapped donation

### Files Changed
- Backend: `db/migrate/..._create_stripe_description_mappings.rb` (new)
- Backend: `db/migrate/..._create_unmapped_donations.rb` (new)
- Backend: `app/models/stripe_description_mapping.rb` (new)
- Backend: `app/models/unmapped_donation.rb` (new)
- Backend: `app/services/stripe_donation_import_service.rb` (update)
- Backend: `app/controllers/api/admin/stripe_description_mappings_controller.rb` (new)
- Backend: `app/controllers/api/admin/unmapped_donations_controller.rb` (new)
- Backend: `app/mailers/admin_notification_mailer.rb` (new)
- Backend: `app/views/admin_notification_mailer/unmapped_donation.html.erb` (new)
- Backend: `spec/models/stripe_description_mapping_spec.rb` (new)
- Backend: `spec/models/unmapped_donation_spec.rb` (new)
- Backend: `spec/services/stripe_donation_import_service_spec.rb` (update)
- Backend: `spec/mailers/admin_notification_mailer_spec.rb` (new)
- Frontend: `src/components/admin/StripeMappingRules.tsx` (new)
- Frontend: `src/components/admin/UnmappedDonationsQueue.tsx` (new)
- Frontend: `cypress/e2e/admin/stripe-mapping.cy.ts` (new)

### Related Commits
- (To be added during commit)
