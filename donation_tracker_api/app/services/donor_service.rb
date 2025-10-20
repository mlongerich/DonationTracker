class DonorService
  def self.find_or_update_by_email(donor_attributes, transaction_date)
    # Normalize email before lookup (match Donor model's set_defaults logic)
    lookup_email = normalize_email(donor_attributes[:email], donor_attributes[:name])
    # Case-insensitive email lookup to match uniqueness validation
    existing_donor = Donor.where("LOWER(email) = ?", lookup_email.downcase).first

    if existing_donor
      # Update existing donor if transaction is newer
      # Handle nil last_updated_at for legacy donors (default to very old date)
      last_updated = existing_donor.last_updated_at || Time.zone.at(0)
      if transaction_date > last_updated
        # Smart field preservation: don't overwrite existing data with blank values
        update_attrs = donor_attributes.merge(last_updated_at: transaction_date)
        update_attrs.delete(:name) if donor_attributes[:name].blank?

        existing_donor.update!(update_attrs)
      end
      { donor: existing_donor, created: false }
    else
      # Create new donor
      donor = Donor.new(donor_attributes)
      donor.last_updated_at = transaction_date
      donor.save!
      { donor: donor, created: true }
    end
  end

  private

  def self.normalize_email(email, name)
    return email unless email.blank?

    # If email is blank, generate it from name (matching Donor model logic)
    normalized_name = name.blank? ? "Anonymous" : name
    clean_name = normalized_name.gsub(/\s+/, "")
    "#{clean_name}@mailinator.com"
  end
end
