require 'rails_helper'

RSpec.describe StripePaymentImportService do
  let(:valid_csv_row) do
    {
      'Amount' => '100',
      'Billing Details Name' => 'John Doe',
      'Cust Email' => 'john@example.com',
      'Created Formatted' => '2020-06-15 00:56:17 +0000',
      'Description' => 'Monthly Sponsorship Donation for Sangwan',
      'Transaction ID' => 'txn_123abc',
      'Cust ID' => 'cus_abc123',
      'Cust Subscription Data ID' => 'sub_xyz789',
      'Status' => 'succeeded'
    }
  end

  describe '#import' do
    context 'with valid sponsorship donation' do
      it 'creates a donation record' do
        expect {
          described_class.new(valid_csv_row).import
        }.to change(Donation, :count).by(1)
      end

      it 'extracts child name from description' do
        result = described_class.new(valid_csv_row).import
        donation = result[:donations].first

        expect(donation.sponsorship.child.name).to eq('Sangwan')
      end

      it 'stores Stripe metadata on donation' do
        result = described_class.new(valid_csv_row).import
        donation = result[:donations].first

        expect(donation.stripe_charge_id).to eq('txn_123abc')
        expect(donation.stripe_customer_id).to eq('cus_abc123')
        expect(donation.stripe_subscription_id).to eq('sub_xyz789')
      end

      it 'converts amount from dollars to cents' do
        csv_row = valid_csv_row.merge('Amount' => '150.50')
        result = described_class.new(csv_row).import
        donation = result[:donations].first

        expect(donation.amount).to eq(15050)
      end
    end

    context 'with duplicate import (idempotency)' do
      before do
        described_class.new(valid_csv_row).import
      end

      it 'skips already imported stripe_charge_id' do
        result = described_class.new(valid_csv_row).import

        expect(result[:skipped]).to be true
        expect(result[:reason]).to eq('Already imported')
      end

      it 'checks StripeInvoice table for idempotency' do
        expect(StripeInvoice).to receive(:exists?).with(stripe_invoice_id: 'txn_123abc').and_return(true)

        described_class.new(valid_csv_row).import
      end
    end

    context 'with multi-child sponsorship' do
      let(:multi_child_csv) do
        valid_csv_row.merge(
          'ID' => 'ch_multi123',
          'Description' => 'Monthly Sponsorship Donation for Wan,Monthly Sponsorship Donation for Orawan',
          'Transaction ID' => 'txn_multi123'
        )
      end

      it 'creates one StripeInvoice and two donations' do
        expect {
          described_class.new(multi_child_csv).import
        }.to change(StripeInvoice, :count).by(1)
         .and change(Donation, :count).by(2)
      end
    end

    context 'with single-child sponsorship' do
      it 'creates a StripeInvoice' do
        expect {
          described_class.new(valid_csv_row).import
        }.to change(StripeInvoice, :count).by(1)
      end

      it 'links donation to StripeInvoice via stripe_invoice_id' do
        result = described_class.new(valid_csv_row).import
        donation = result[:donations].first

        expect(donation.stripe_invoice_id).to eq('txn_123abc')
      end

      it 'stores correct metadata in StripeInvoice' do
        described_class.new(valid_csv_row).import
        invoice = StripeInvoice.find_by(stripe_invoice_id: 'txn_123abc')

        expect(invoice.stripe_charge_id).to eq('txn_123abc')
        expect(invoice.stripe_customer_id).to eq('cus_abc123')
        expect(invoice.stripe_subscription_id).to eq('sub_xyz789')
        expect(invoice.total_amount_cents).to eq(10000)
        expect(invoice.invoice_date).to eq(Date.parse('2020-06-15'))
      end
    end
  end
end
