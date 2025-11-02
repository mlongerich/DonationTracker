require 'rails_helper'

RSpec.describe StripePaymentImportService do
  let(:valid_csv_row) do
    {
      'Amount' => '100',
      'Billing Details Name' => 'John Doe',
      'Cust Email' => 'john@example.com',
      'Created Formatted' => '2020-06-15 00:56:17 +0000',
      'Description' => 'Invoice ABC123',  # Actual CSV has invoice IDs here
      'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Sangwan',  # Real data here
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
          'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Wan,Monthly Sponsorship Donation for Orawan',
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

    context 'with donor deduplication' do
      it 'reuses existing donor with matching email' do
        # Create existing donor with OLDER last_updated_at (2019)
        existing_donor = Donor.create!(
          name: 'Existing Name',
          email: 'john@example.com',
          last_updated_at: DateTime.parse('2019-01-01')
        )

        # CSV transaction is from 2020-06-15, newer than existing donor
        described_class.new(valid_csv_row).import

        # Should reuse existing donor, not create new one
        expect(Donor.count).to eq(1)
        donor = Donor.first
        expect(donor.id).to eq(existing_donor.id)
        # Should update name because CSV transaction is newer
        expect(donor.name).to eq('John Doe')
      end
    end

    context 'with failed transaction status' do
      it 'skips non-succeeded transactions' do
        failed_csv = valid_csv_row.merge('Status' => 'failed')
        result = described_class.new(failed_csv).import

        expect(result[:skipped]).to be true
        expect(result[:reason]).to eq('Status not succeeded')
        expect(Donation.count).to eq(0)
      end
    end

    context 'with child deduplication' do
      it 'reuses existing child with matching name' do
        existing_child = Child.create!(name: 'Sangwan')

        result = described_class.new(valid_csv_row).import

        expect(Child.count).to eq(1)
        child = Child.first
        expect(child.id).to eq(existing_child.id)
      end
    end

    context 'with general donation' do
      it 'creates general project donation' do
        general_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => '$100 - General Monthly Donation',
          'Transaction ID' => 'txn_general123'
        )

        result = described_class.new(general_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('General Donation')
        expect(donation.project.project_type).to eq('general')
        expect(donation.child_id).to be_nil
      end
    end

    context 'with campaign donation' do
      it 'creates campaign project donation' do
        campaign_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => '',  # Campaigns don't have nickname
          'Description' => 'Donation for Campaign 21460',  # Fallback to Description
          'Transaction ID' => 'txn_campaign123'
        )

        result = described_class.new(campaign_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('Campaign 21460')
        expect(donation.project.project_type).to eq('campaign')
        expect(donation.child_id).to be_nil
      end
    end

    context 'with email address as description' do
      it 'maps to general donation project' do
        email_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => '',  # Nickname empty
          'Description' => 'dlongerich@gmail.com',  # Fallback to Description
          'Transaction ID' => 'txn_email123'
        )

        result = described_class.new(email_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('General Donation')
        expect(donation.project.project_type).to eq('general')
        expect(donation.child_id).to be_nil
      end
    end

    context 'with unmapped donation' do
      it 'creates unmapped project donation' do
        unmapped_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => 'Book',
          'Transaction ID' => 'txn_unmapped123'
        )

        result = described_class.new(unmapped_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('UNMAPPED: Book')
        expect(donation.project.project_type).to eq('general')
        expect(donation.child_id).to be_nil
      end
    end
  end
end
