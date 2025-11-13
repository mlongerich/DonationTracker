require 'rails_helper'

RSpec.describe SponsorshipPresenter do
  let(:donor) { create(:donor, name: 'John Doe') }
  let(:child) { create(:child, name: 'Maria') }
  let(:sponsorship) { create(:sponsorship, donor: donor, child: child, monthly_amount: 50) }

  describe '#as_json' do
    subject { described_class.new(sponsorship).as_json }

    it 'includes all required fields' do
      expect(subject.keys).to match_array([
        :id, :donor_id, :donor_name, :child_id, :child_name,
        :monthly_amount, :active, :end_date, :created_at, :project_id,
        :start_date, :last_donation_date, :project_title
      ])
    end

    it 'formats monthly_amount as string' do
      expect(subject[:monthly_amount]).to eq('50.0')
    end

    it 'includes donor and child names when eager loaded' do
      expect(subject[:donor_name]).to eq('John Doe')
      expect(subject[:child_name]).to eq('Maria')
    end

    context 'with ended sponsorship' do
      let(:sponsorship) { create(:sponsorship, donor: donor, child: child, end_date: Date.yesterday) }

      it 'returns active as false' do
        expect(subject[:active]).to be false
      end
    end
  end
end
