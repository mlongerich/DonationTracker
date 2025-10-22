class AddPerformanceIndexes < ActiveRecord::Migration[8.0]
  def change
    # Donations table indexes
    # Used for: Date range filtering and ordering in DonationsController#index
    add_index :donations, :date, name: 'index_donations_on_date'

    # Used for: Status filtering in Ransack queries
    add_index :donations, :status, name: 'index_donations_on_status'

    # Used for: Project-specific donations sorted by date
    add_index :donations, [ :project_id, :date ], name: 'index_donations_on_project_id_and_date'

    # Sponsorships table indexes
    # Used for: Sponsorship.active scope (where end_date IS NULL)
    add_index :sponsorships, :end_date, name: 'index_sponsorships_on_end_date'

    # Used for: TICKET-056 uniqueness validation (prevents duplicate active sponsorships)
    add_index :sponsorships,
              [ :donor_id, :child_id, :monthly_amount, :end_date ],
              name: 'index_sponsorships_on_uniqueness_fields'

    # Projects table indexes
    # Used for: Filtering by project type (general vs sponsorship)
    add_index :projects, :project_type, name: 'index_projects_on_project_type'
  end
end
