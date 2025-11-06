# frozen_string_literal: true

# Merges multiple donor records into a single donor with field-level selection.
#
# This service handles:
# - Validation of donor IDs and field selections
# - Building merged donor attributes from field selections
# - Reassigning donations and sponsorships from source donors to target donor
# - Soft-deleting source donors with merged_into_id tracking
# - Transaction safety (all-or-nothing merge)
#
# Uses instance method pattern for complex multi-step operations.
#
# @example Merge two donors
#   service = DonorMergeService.new(
#     donor_ids: [1, 2],
#     field_selections: { name: 1, email: 2 }
#   )
#   result = service.merge
#   # => { merged_donor: <Donor>, merged_count: 2 }
#
# @see Donor for donor model
# @see Api::DonorsController#merge for API endpoint
# @see TICKET-004 for donor merge implementation
class DonorMergeService
  REQUIRED_FIELDS = [ :name, :email ].freeze

  def initialize(donor_ids:, field_selections:)
    @donor_ids = donor_ids
    @field_selections = field_selections
    @donors = nil
  end

  def merge
    validate_inputs!
    load_donors
    perform_merge_transaction
  end

  private

  def validate_inputs!
    raise ArgumentError, "Must provide at least 2 donors" if @donor_ids.length < 2

    validate_required_fields
    validate_field_selection_values
  end

  def validate_required_fields
    missing_fields = REQUIRED_FIELDS - @field_selections.keys
    raise ArgumentError, "Missing field selections: #{missing_fields.join(', ')}" if missing_fields.any?
  end

  def validate_field_selection_values
    @field_selections.values.each do |selected_id|
      unless @donor_ids.include?(selected_id)
        raise ArgumentError, "Invalid donor ID in field selections: #{selected_id}"
      end
    end
  end

  def load_donors
    @donors = @donor_ids.map { |id| Donor.find(id) }
  end

  def perform_merge_transaction
    merged_attributes = build_merged_attributes

    merged_donor = Donor.transaction do
      temporarily_change_emails
      soft_delete_source_donors
      new_donor = create_merged_donor(merged_attributes)

      # Reassign associations after creating merged donor
      @donations_count = reassign_donations(new_donor.id)
      @sponsorships_count = reassign_sponsorships(new_donor.id)

      new_donor
    end

    {
      merged_donor: merged_donor,
      donations_reassigned: @donations_count,
      sponsorships_reassigned: @sponsorships_count
    }
  end

  def build_merged_attributes
    merged_attributes = {}
    @field_selections.each do |field, source_donor_id|
      source_donor = @donors.find { |donor| donor.id == source_donor_id }
      merged_attributes[field] = source_donor.send(field)
    end
    merged_attributes
  end

  def temporarily_change_emails
    # Temporarily change source donor emails to free up uniqueness constraint
    @donors.each do |donor|
      donor.update_column(:email, "merged_#{donor.id}_#{Time.now.to_i}@discarded.local")
    end
  end

  def soft_delete_source_donors
    @donors.each(&:discard)
  end

  def create_merged_donor(merged_attributes)
    new_donor = Donor.create!(merged_attributes)

    # Set merged_into_id on source donors
    @donors.each { |donor| donor.update_column(:merged_into_id, new_donor.id) }

    new_donor
  end

  def reassign_donations(merged_donor_id)
    Donation.where(donor_id: @donor_ids)
            .update_all(donor_id: merged_donor_id)
  end

  def reassign_sponsorships(merged_donor_id)
    Sponsorship.where(donor_id: @donor_ids)
               .update_all(donor_id: merged_donor_id)
  end
end
