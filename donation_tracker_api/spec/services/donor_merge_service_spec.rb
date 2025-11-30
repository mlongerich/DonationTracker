require 'rails_helper'

RSpec.describe DonorMergeService do
  describe '#merge' do
    let!(:donor1) { create(:donor, name: 'Alice Smith', email: 'alice@example.com') }
    let!(:donor2) { create(:donor, name: 'Alice S.', email: 'alice.smith@example.com') }

    it 'raises error when fewer than 2 donors provided' do
      expect {
        DonorMergeService.new(
          donor_ids: [ donor1.id ],
          field_selections: { name: donor1.id, email: donor1.id }
        ).merge
      }.to raise_error(ArgumentError, /at least 2 donors/)
    end

    it 'raises error when donor does not exist' do
      expect {
        DonorMergeService.new(
          donor_ids: [ donor1.id, 99999 ],
          field_selections: { name: donor1.id, email: donor1.id }
        ).merge
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'raises error when field_selections is missing required fields' do
      expect {
        DonorMergeService.new(
          donor_ids: [ donor1.id, donor2.id ],
          field_selections: { name: donor1.id }
        ).merge
      }.to raise_error(ArgumentError, /Missing field selections/)
    end

    it 'raises error when field selection references donor not in donor_ids' do
      expect {
        DonorMergeService.new(
          donor_ids: [ donor1.id, donor2.id ],
          field_selections: { name: 99999, email: donor2.id }
        ).merge
      }.to raise_error(ArgumentError, /Invalid donor ID/)
    end

    it 'creates a new donor with selected fields from source donors' do
      field_selections = { name: donor1.id, email: donor2.id }

      result = DonorMergeService.new(
        donor_ids: [ donor1.id, donor2.id ],
        field_selections: field_selections
      ).merge

      expect(result[:merged_donor]).to be_present
      expect(result[:merged_donor].name).to eq('Alice Smith')
      expect(result[:merged_donor].email).to eq('alice.smith@example.com')
    end

    it 'soft deletes source donors and sets merged_into_id' do
      field_selections = { name: donor1.id, email: donor2.id }

      result = DonorMergeService.new(
        donor_ids: [ donor1.id, donor2.id ],
        field_selections: field_selections
      ).merge

      merged_id = result[:merged_donor].id

      expect(donor1.reload.discarded?).to be true
      expect(donor1.merged_into_id).to eq(merged_id)

      expect(donor2.reload.discarded?).to be true
      expect(donor2.merged_into_id).to eq(merged_id)
    end

    context 'donation reassignment' do
      it 'reassigns all donations from source donors to merged donor' do
        # Create donations for both source donors
        project = create(:project, title: 'Test Project', project_type: :general)
        donation1 = create(:donation, donor: donor1, amount: 10000, date: Date.today, project: project)
        donation2 = create(:donation, donor: donor2, amount: 20000, date: Date.today, project: project)

        field_selections = { name: donor1.id, email: donor2.id }

        result = DonorMergeService.new(
          donor_ids: [ donor1.id, donor2.id ],
          field_selections: field_selections
        ).merge

        merged_donor = result[:merged_donor]

        # Both donations should now belong to merged donor
        expect(donation1.reload.donor_id).to eq(merged_donor.id)
        expect(donation2.reload.donor_id).to eq(merged_donor.id)
      end
    end

    context 'sponsorship reassignment' do
      it 'reassigns all sponsorships from source donors to merged donor' do
        # Create sponsorships for both source donors
        child1 = create(:child, name: 'Child One')
        child2 = create(:child, name: 'Child Two')
        sponsorship1 = create(:sponsorship, donor: donor1, child: child1, monthly_amount: 5000)
        sponsorship2 = create(:sponsorship, donor: donor2, child: child2, monthly_amount: 7500)

        field_selections = { name: donor1.id, email: donor2.id }

        result = DonorMergeService.new(
          donor_ids: [ donor1.id, donor2.id ],
          field_selections: field_selections
        ).merge

        merged_donor = result[:merged_donor]

        # Both sponsorships should now belong to merged donor
        expect(sponsorship1.reload.donor_id).to eq(merged_donor.id)
        expect(sponsorship2.reload.donor_id).to eq(merged_donor.id)
      end
    end

    context 'reassignment counts' do
      it 'returns correct donation and sponsorship counts' do
        # Create donations and sponsorships
        project = create(:project, title: 'Test Project', project_type: :general)
        create(:donation, donor: donor1, amount: 10000, date: Date.today, project: project)
        create(:donation, donor: donor2, amount: 20000, date: Date.today, project: project)
        create(:donation, donor: donor2, amount: 30000, date: Date.today, project: project)

        child = create(:child, name: 'Test Child')
        create(:sponsorship, donor: donor1, child: child, monthly_amount: 5000)

        field_selections = { name: donor1.id, email: donor2.id }

        result = DonorMergeService.new(
          donor_ids: [ donor1.id, donor2.id ],
          field_selections: field_selections
        ).merge

        expect(result[:donations_reassigned]).to eq(3)
        expect(result[:sponsorships_reassigned]).to eq(1)
      end

      it 'handles donors with no donations or sponsorships' do
        field_selections = { name: donor1.id, email: donor2.id }

        result = DonorMergeService.new(
          donor_ids: [ donor1.id, donor2.id ],
          field_selections: field_selections
        ).merge

        expect(result[:donations_reassigned]).to eq(0)
        expect(result[:sponsorships_reassigned]).to eq(0)
        expect(result[:merged_donor]).to be_present
      end
    end

    it 'merges phone field from selected donor' do
      donor_with_phone = create(:donor, name: 'Phone User', email: 'phone@example.com', phone: '5551234567')
      donor_without_phone = create(:donor, name: 'No Phone', email: 'nophone@example.com')

      field_selections = {
        name: donor_with_phone.id,
        email: donor_with_phone.id,
        phone: donor_with_phone.id
      }

      result = DonorMergeService.new(
        donor_ids: [ donor_with_phone.id, donor_without_phone.id ],
        field_selections: field_selections
      ).merge

      expect(result[:merged_donor].phone).to eq('5551234567')
    end

    it 'merges address fields as a composite from selected donor' do
      donor_with_address = create(:donor,
        name: 'Address User',
        email: 'address@example.com',
        address_line1: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701',
        country: 'US')
      donor_without_address = create(:donor, name: 'No Address', email: 'noaddress@example.com')

      field_selections = {
        name: donor_without_address.id,
        email: donor_without_address.id,
        address: donor_with_address.id
      }

      result = DonorMergeService.new(
        donor_ids: [ donor_with_address.id, donor_without_address.id ],
        field_selections: field_selections
      ).merge

      merged = result[:merged_donor]
      expect(merged.address_line1).to eq('123 Main St')
      expect(merged.city).to eq('Springfield')
    end
  end
end
