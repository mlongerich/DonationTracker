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

    context 'with different payment statuses' do
      it 'creates donation with succeeded status for succeeded payments' do
        succeeded_csv = valid_csv_row.merge('Status' => 'succeeded')
        result = described_class.new(succeeded_csv).import

        expect(result[:success]).to be true
        expect(result[:donations].first.status).to eq('succeeded')
      end

      it 'creates donation with failed status for failed payments' do
        failed_csv = valid_csv_row.merge('Status' => 'failed', 'Transaction ID' => 'txn_failed123')
        result = described_class.new(failed_csv).import

        expect(result[:success]).to be true
        expect(result[:donations].first.status).to eq('failed')
      end

      it 'creates donation with refunded status for refunded payments' do
        refunded_csv = valid_csv_row.merge('Status' => 'refunded', 'Transaction ID' => 'txn_refunded123')
        result = described_class.new(refunded_csv).import

        expect(result[:success]).to be true
        expect(result[:donations].first.status).to eq('refunded')
      end

      it 'creates donation with canceled status for canceled payments' do
        canceled_csv = valid_csv_row.merge('Status' => 'canceled', 'Transaction ID' => 'txn_canceled123')
        result = described_class.new(canceled_csv).import

        expect(result[:success]).to be true
        expect(result[:donations].first.status).to eq('canceled')
      end
    end

    context 'with metadata extraction' do
      it 'uses metadata child_id over nickname parsing' do
        child = Child.create!(id: 42, name: 'Buntita')
        csv_row = valid_csv_row.merge(
          'metadata' => { 'child_id' => '42' },
          'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for OtherChild',
          'Transaction ID' => 'txn_metadata123'
        )
        result = described_class.new(csv_row).import

        expect(result[:donations].first.child_id).to eq(42)
      end

      it 'uses metadata project_id over description parsing' do
        project = Project.create!(id: 7, title: 'Water Project', project_type: :general)
        csv_row = valid_csv_row.merge(
          'metadata' => { 'project_id' => '7' },
          'Cust Subscription Data Plan Nickname' => '',
          'Description' => 'Some other description',
          'Transaction ID' => 'txn_metadata_project123'
        )
        result = described_class.new(csv_row).import

        expect(result[:donations].first.project_id).to eq(7)
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

    context 'with blank description' do
      it 'maps to general donation project' do
        blank_csv = valid_csv_row.merge(
          'Description' => '',
          'Cust Subscription Data Plan Nickname' => '',
          'Transaction ID' => 'txn_blank123'
        )

        result = described_class.new(blank_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('General Donation')
        expect(donation.project.project_type).to eq('general')
        expect(donation.project.system).to be true
        expect(donation.child_id).to be_nil
      end
    end

    context 'with invoice description' do
      it 'maps to general donation project' do
        invoice_csv = valid_csv_row.merge(
          'Description' => 'Invoice ABC-12345',
          'Cust Subscription Data Plan Nickname' => '',
          'Transaction ID' => 'txn_invoice123'
        )

        result = described_class.new(invoice_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('General Donation')
        expect(donation.project.project_type).to eq('general')
        expect(donation.project.system).to be true
        expect(donation.child_id).to be_nil
      end
    end

    context 'with all-numeric description' do
      it 'maps to general donation project' do
        numeric_csv = valid_csv_row.merge(
          'Description' => '66826191275',
          'Cust Subscription Data Plan Nickname' => '',
          'Transaction ID' => 'txn_numeric123'
        )

        result = described_class.new(numeric_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('General Donation')
        expect(donation.project.project_type).to eq('general')
        expect(donation.project.system).to be true
        expect(donation.child_id).to be_nil
      end
    end

    context 'with subscription creation description' do
      it 'maps to general donation project' do
        subscription_csv = valid_csv_row.merge(
          'Description' => 'Subscription creation',
          'Cust Subscription Data Plan Nickname' => '',
          'Transaction ID' => 'txn_subscription123'
        )

        result = described_class.new(subscription_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('General Donation')
        expect(donation.project.project_type).to eq('general')
        expect(donation.project.system).to be true
        expect(donation.child_id).to be_nil
      end
    end

    context 'with payment app description' do
      it 'maps to general donation project' do
        payment_app_csv = valid_csv_row.merge(
          'Description' => 'Captured via Payment app (Android)',
          'Cust Subscription Data Plan Nickname' => '',
          'Transaction ID' => 'txn_paymentapp123'
        )

        result = described_class.new(payment_app_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('General Donation')
        expect(donation.project.project_type).to eq('general')
        expect(donation.project.system).to be true
        expect(donation.child_id).to be_nil
      end
    end

    context 'with stripe app description' do
      it 'maps to general donation project' do
        stripe_app_csv = valid_csv_row.merge(
          'Description' => 'Payment for Stripe App',
          'Cust Subscription Data Plan Nickname' => '',
          'Transaction ID' => 'txn_stripeapp123'
        )

        result = described_class.new(stripe_app_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('General Donation')
        expect(donation.project.project_type).to eq('general')
        expect(donation.project.system).to be true
        expect(donation.child_id).to be_nil
      end
    end

    context 'with named project donation' do
      it 'creates named project donation (no UNMAPPED prefix)' do
        unmapped_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => 'Book',
          'Transaction ID' => 'txn_unmapped123'
        )

        result = described_class.new(unmapped_csv).import
        donation = result[:donations].first

        expect(donation.project.title).to eq('Book')
        expect(donation.project.project_type).to eq('general')
        expect(donation.child_id).to be_nil
      end
    end

    context 'with multi-child sponsorship (separate rows, same Transaction ID)' do
      it 'allows second child donation when first child already imported' do
        # First row - Wan
        first_row = valid_csv_row.merge(
          'Transaction ID' => 'txn_multi_child',
          'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Wan'
        )

        # Import first child
        described_class.new(first_row).import

        # Second row - Orawan (same Transaction ID, different child)
        second_row = valid_csv_row.merge(
          'Transaction ID' => 'txn_multi_child',
          'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Orawan'
        )

        # Should NOT skip, should create second donation
        expect {
          described_class.new(second_row).import
        }.to change(Donation, :count).by(1)
      end
    end


    context 'with merged donor' do
      it 'assigns donation to merged donor not original donor' do
        # Setup: Create donor1 with existing donation
        donor1 = create(:donor, name: "Jane Smith", email: "jane@example.com")
        project = create(:project)
        create(:donation, :stripe,
          donor: donor1,
          project: project,
          amount: 10000,
          stripe_customer_id: "cus_merged123"
        )

        # Setup: Create donor2 (merged donor)
        donor2 = create(:donor, name: "Jane Smith", email: "jane.smith@example.com")

        # Setup: Simulate merge (donor1 → donor2)
        donor1.update_column(:merged_into_id, donor2.id)
        donor1.discard

        # Import new CSV row with same stripe_customer_id
        csv_row = valid_csv_row.merge(
          'Cust ID' => 'cus_merged123',
          'Transaction ID' => 'txn_new_payment',
          'Description' => 'New payment after merge',
          'Cust Subscription Data Plan Nickname' => ''
        )

        result = described_class.new(csv_row).import
        new_donation = result[:donations].first

        # Should assign to merged donor (donor2), not original (donor1)
        expect(new_donation.donor_id).to eq(donor2.id)
        expect(new_donation.donor_id).not_to eq(donor1.id)
      end
    end

    context 'with new idempotency logic (subscription_id + child_id)', use_transactional_fixtures: false do
      it 'allows same subscription_id with different child_id (multi-child sponsorship)' do
        # First import: Child 1 with subscription
        Child.create!(name: 'Buntita')
        first_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Buntita',
          'Cust Subscription Data ID' => 'sub_MULTI123',
          'Transaction ID' => 'txn_first'
        )
        described_class.new(first_csv).import

        # Second import: Child 2 with SAME subscription (valid multi-child case)
        Child.create!(name: 'Orawan')
        second_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Orawan',
          'Cust Subscription Data ID' => 'sub_MULTI123',
          'Transaction ID' => 'txn_second'
        )

        result = described_class.new(second_csv).import

        expect(result[:skipped]).to be false
        expect(result[:success]).to be true
        expect(Donation.count).to eq(2) # Should create both donations
      end

      it 'imports duplicate child in same invoice and flags as needs_attention' do
        # First import: Buntita in invoice txn_SAME
        Child.create!(name: 'Buntita')
        first_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Buntita',
          'Cust Subscription Data ID' => 'sub_ABC123',
          'Transaction ID' => 'txn_SAME'
        )
        first_result = described_class.new(first_csv).import
        first_donation = first_result[:donations].first

        # Second import: Same child, SAME invoice (duplicate within invoice)
        second_csv = valid_csv_row.merge(
          'Cust Subscription Data Plan Nickname' => 'Monthly Sponsorship Donation for Buntita',
          'Cust Subscription Data ID' => 'sub_ABC123',
          'Transaction ID' => 'txn_SAME'
        )

        result = described_class.new(second_csv).import

        expect(result[:skipped]).to be false
        expect(result[:success]).to be true
        expect(Donation.count).to eq(2) # Both should be imported

        second_donation = result[:donations].first
        expect(second_donation.status).to eq('needs_attention')
        expect(second_donation.needs_attention_reason).to include('Duplicate child in same invoice')
      end
    end
  end
end
