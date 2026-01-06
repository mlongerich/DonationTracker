# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::Reports', type: :request do
  describe 'GET /api/reports/donations' do
    it 'returns CSV with correct filename format' do
      start_date = '2025-01-01'
      end_date = '2025-12-31'

      get '/api/reports/donations', params: { start_date: start_date, end_date: end_date }

      expect(response).to have_http_status(:success)
      expect(response.content_type).to eq('text/csv')
      expect(response.headers['Content-Disposition']).to include('donations_report_20250101_20251231.csv')
    end

    it 'returns error when start_date is after end_date' do
      start_date = '2025-12-31'
      end_date = '2025-01-01'

      get '/api/reports/donations', params: { start_date: start_date, end_date: end_date }

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body['error']).to include('start_date must be before or equal to end_date')
    end

    it 'returns JSON when format=json' do
      start_date = '2025-01-01'
      end_date = '2025-12-31'
      donor = create(:donor, name: 'John Doe')
      create(:donation, donor: donor, amount: 10_000, date: Date.new(2025, 6, 15))

      get '/api/reports/donations', params: { start_date: start_date, end_date: end_date, format: 'json' }

      expect(response).to have_http_status(:success)
      expect(response.content_type).to include('application/json')

      body = response.parsed_body
      expect(body).to have_key('donations')
      expect(body).to have_key('donor_summary')
      expect(body).to have_key('project_summary')
      expect(body).to have_key('meta')
      expect(body['donations']).to be_an(Array)
      expect(body['donor_summary']).to be_an(Array)
      expect(body['project_summary']).to be_an(Array)
      expect(body['meta']['start_date']).to eq(start_date)
      expect(body['meta']['end_date']).to eq(end_date)
      expect(body['meta']).to have_key('total_amount')
    end
  end
end
