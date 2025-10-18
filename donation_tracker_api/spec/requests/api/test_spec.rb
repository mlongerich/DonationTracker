# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::Test', type: :request do
  describe 'DELETE /api/test/cleanup' do
    let(:donor) { create(:donor) }
    let!(:donation1) { create(:donation, donor: donor, amount: 100) }
    let!(:donation2) { create(:donation, donor: donor, amount: 200) }

    it 'deletes all donations and donors' do
      expect(Donation.count).to eq(2)
      expect(Donor.count).to eq(1)

      delete '/api/test/cleanup'

      expect(response).to have_http_status(:ok)
      expect(Donation.count).to eq(0)
      expect(Donor.count).to eq(0)
    end

    context 'when in production environment' do
      before do
        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
      end

      it 'returns forbidden status' do
        delete '/api/test/cleanup'

        expect(response).to have_http_status(:forbidden)
      end
    end
  end
end
