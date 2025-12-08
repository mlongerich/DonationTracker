# frozen_string_literal: true

require 'rails_helper'

# Tests for Admin API endpoints
#
# This spec covers Stripe CSV import functionality via web interface.
# Tests controller integration only - service logic tested in stripe_csv_batch_importer_spec.rb
#
# @see Api::AdminController
# @see StripeCsvBatchImporter
RSpec.describe 'Api::Admin', type: :request do
  describe 'POST /api/admin/import/stripe_payments' do
    let(:csv_file) { fixture_file_upload('stripe_payments_valid.csv', 'text/csv') }

    it 'returns success counts' do
      # Mock the importer service to avoid actual file processing
      allow(StripeCsvBatchImporter).to receive(:new).and_return(
        double(import: {
          succeeded_count: 3,
          skipped_count: 1,
          failed_count: 0,
          needs_attention_count: 1,
          errors: []
        })
      )

      post '/api/admin/import/stripe_payments', params: { file: csv_file }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['success_count']).to eq(3)
      expect(json['skipped_count']).to eq(1)
      expect(json['needs_attention_count']).to eq(1)
      expect(json['failed_count']).to eq(0)
      expect(json['errors']).to eq([])
    end

    it 'returns error summary with row details' do
      # Mock the importer service to return errors
      allow(StripeCsvBatchImporter).to receive(:new).and_return(
        double(import: {
          succeeded_count: 2,
          skipped_count: 0,
          failed_count: 2,
          needs_attention_count: 0,
          errors: [
            { row: 3, message: 'Invalid child name' },
            { row: 5, message: 'Missing donor email' }
          ]
        })
      )

      post '/api/admin/import/stripe_payments', params: { file: csv_file }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['failed_count']).to eq(2)
      expect(json['errors'].length).to eq(2)
      expect(json['errors'][0]['row']).to eq(3)
      expect(json['errors'][0]['error']).to eq('Invalid child name')
    end

    it 'returns error when file parameter is missing' do
      post '/api/admin/import/stripe_payments'

      expect(response).to have_http_status(:internal_server_error)
      json = JSON.parse(response.body)
      expect(json['error']).to be_present
    end

    it 'handles malformed CSV gracefully' do
      # Mock the importer to raise CSV error
      allow(StripeCsvBatchImporter).to receive(:new).and_raise(StandardError.new('Malformed CSV'))

      post '/api/admin/import/stripe_payments', params: { file: csv_file }

      expect(response).to have_http_status(:internal_server_error)
      json = JSON.parse(response.body)
      expect(json['error']).to include('Import failed')
    end

    it 'handles CSV files with non-UTF-8 encoding' do
      # Create a CSV with non-UTF-8 characters (simulating real Stripe export)
      csv_content = +"Amount,Name\n100,Test\xE0User"
      csv_content.force_encoding('ASCII-8BIT')
      csv_file_with_encoding = Rack::Test::UploadedFile.new(
        StringIO.new(csv_content),
        'text/csv',
        original_filename: 'test_encoding.csv'
      )

      allow(StripeCsvBatchImporter).to receive(:new).and_return(
        double(import: {
          succeeded_count: 1,
          skipped_count: 0,
          failed_count: 0,
          needs_attention_count: 0,
          errors: []
        })
      )

      post '/api/admin/import/stripe_payments', params: { file: csv_file_with_encoding }

      expect(response).to have_http_status(:success)
    end
  end
end
