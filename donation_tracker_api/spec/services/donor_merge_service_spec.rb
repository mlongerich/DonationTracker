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
  end
end
