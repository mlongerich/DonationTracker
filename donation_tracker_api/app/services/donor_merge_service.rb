class DonorMergeService
  REQUIRED_FIELDS = [ :name, :email ].freeze

  def self.merge(donor_ids:, field_selections:)
    raise ArgumentError, "Must provide at least 2 donors" if donor_ids.length < 2

    # Validate all donors exist
    donors = donor_ids.map { |id| Donor.find(id) }

    # Validate field_selections has all required fields
    missing_fields = REQUIRED_FIELDS - field_selections.keys
    raise ArgumentError, "Missing field selections: #{missing_fields.join(', ')}" if missing_fields.any?

    # Validate field selection values are in donor_ids
    field_selections.values.each do |selected_id|
      unless donor_ids.include?(selected_id)
        raise ArgumentError, "Invalid donor ID in field selections: #{selected_id}"
      end
    end

    # Build merged donor attributes
    merged_attributes = {}
    field_selections.each do |field, source_donor_id|
      source_donor = donors.find { |d| d.id == source_donor_id }
      merged_attributes[field] = source_donor.send(field)
    end

    # Perform merge in transaction
    merged_donor = Donor.transaction do
      # Temporarily change source donor emails to free up uniqueness constraint
      donors.each_with_index do |donor, index|
        donor.update_column(:email, "merged_#{donor.id}_#{Time.now.to_i}@discarded.local")
      end

      # Soft delete source donors
      donors.each(&:discard)

      # Create merged donor
      new_donor = Donor.create!(merged_attributes)

      # Set merged_into_id on source donors
      donors.each { |d| d.update_column(:merged_into_id, new_donor.id) }

      new_donor
    end

    { merged_donor: merged_donor }
  end
end
