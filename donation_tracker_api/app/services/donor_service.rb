class DonorService
  def self.find_or_update_by_email(donor_attributes, transaction_date)
    existing_donor = Donor.find_by(email: donor_attributes[:email])

    if existing_donor
      # Update existing donor if transaction is newer
      if transaction_date > existing_donor.last_updated_at
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
end
