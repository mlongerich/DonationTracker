# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DonationReportService do
  describe '.generate_report' do
    it 'generates CSV with correct headers' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)

      csv_data = described_class.generate_report(start_date: start_date, end_date: end_date)

      expected_headers = [
        'Date',
        'Donor Name',
        'Email',
        'Phone',
        'Address',
        'Amount',
        'Project/Child',
        'Payment Method',
        'Period Total',
        'Year Total',
        'All-Time Total'
      ].join(',')

      expect(csv_data.lines.first.strip).to eq(expected_headers)
    end

    it 'includes donation in date range' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, name: 'John Doe', email: 'john@example.com')
      project = create(:project, title: 'General Fund')
      donation = create(:donation,
                        donor: donor,
                        project: project,
                        amount: 10_000,
                        date: Date.new(2025, 6, 15),
                        payment_method: 'stripe')

      csv_data = described_class.generate_report(start_date: start_date, end_date: end_date)

      expect(csv_data).to include('John Doe')
      expect(csv_data).to include('2025-06-15')
      expect(csv_data).to include('General Fund')
    end

    it 'hides mailinator.com emails for anonymous donors' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      anonymous_donor = create(:donor, name: 'Anonymous Donor', email: 'anonymous123@mailinator.com')
      donation = create(:donation,
                        donor: anonymous_donor,
                        amount: 5_000,
                        date: Date.new(2025, 3, 10),
                        payment_method: 'stripe')

      csv_data = described_class.generate_report(start_date: start_date, end_date: end_date)

      expect(csv_data).to include('Anonymous Donor')
      expect(csv_data).not_to include('mailinator.com')
    end

    it 'calculates period total correctly' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, name: 'Jane Smith')
      create(:donation, donor: donor, amount: 10_000, date: Date.new(2025, 3, 15), payment_method: 'stripe')
      create(:donation, donor: donor, amount: 5_000, date: Date.new(2025, 6, 20), payment_method: 'check')

      csv_data = described_class.generate_report(start_date: start_date, end_date: end_date)

      # Period total should be sum of both donations in date range
      expect(csv_data).to include('$150.00') # 10000 + 5000 = 15000 cents = $150.00
    end

    it 'calculates year-to-date total correctly' do
      start_date = Date.new(2025, 6, 1)
      end_date = Date.new(2025, 6, 30)
      donor = create(:donor, name: 'Bob Johnson')
      # Donations in same year but outside date range
      create(:donation, donor: donor, amount: 3_000, date: Date.new(2025, 2, 10), payment_method: 'stripe')
      create(:donation, donor: donor, amount: 4_000, date: Date.new(2025, 8, 15), payment_method: 'check')
      # Donation in date range
      create(:donation, donor: donor, amount: 5_000, date: Date.new(2025, 6, 15), payment_method: 'stripe')

      csv_data = described_class.generate_report(start_date: start_date, end_date: end_date)

      # Year total should include all 2025 donations
      expect(csv_data).to include('$120.00') # 3000 + 4000 + 5000 = 12000 cents = $120.00
    end

    it 'calculates all-time total correctly' do
      start_date = Date.new(2025, 6, 1)
      end_date = Date.new(2025, 6, 30)
      donor = create(:donor, name: 'Alice Williams')
      # Donations from previous years
      create(:donation, donor: donor, amount: 2_000, date: Date.new(2023, 5, 10), payment_method: 'stripe')
      create(:donation, donor: donor, amount: 3_000, date: Date.new(2024, 8, 20), payment_method: 'check')
      # Donation in current year and date range
      create(:donation, donor: donor, amount: 5_000, date: Date.new(2025, 6, 15), payment_method: 'stripe')

      csv_data = described_class.generate_report(start_date: start_date, end_date: end_date)

      # All-time total should include all donations across all years
      expect(csv_data).to include('$100.00') # 2000 + 3000 + 5000 = 10000 cents = $100.00
    end

    it 'formats address as comma-separated string and shows child name for sponsorship' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, :with_full_contact,
                     address_line1: '123 Main St',
                     address_line2: 'Apt 4B',
                     city: 'Portland',
                     state: 'OR',
                     zip_code: '97201',
                     country: 'USA')
      child = create(:child, name: 'Sangwan')
      sponsorship = create(:sponsorship, donor: donor, child: child)
      create(:donation,
             donor: donor,
             sponsorship: sponsorship,
             project: sponsorship.project,
             amount: 5_000,
             date: Date.new(2025, 3, 10),
             payment_method: 'stripe')

      csv_data = described_class.generate_report(start_date: start_date, end_date: end_date)

      expect(csv_data).to include('123 Main St, Apt 4B, Portland, OR 97201, USA')
      expect(csv_data).to include('Sangwan')
    end
  end

  describe '.generate_json_report' do
    it 'returns hash with three sections: donations, donor_summary, project_summary' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, name: 'John Doe')
      project = create(:project, title: 'General Fund')
      create(:donation,
             donor: donor,
             project: project,
             amount: 10_000,
             date: Date.new(2025, 6, 15),
             payment_method: 'stripe')

      result = described_class.generate_json_report(start_date: start_date, end_date: end_date)

      expect(result).to be_a(Hash)
      expect(result).to have_key(:donations)
      expect(result).to have_key(:donor_summary)
      expect(result).to have_key(:project_summary)
      expect(result).to have_key(:meta)

      expect(result[:donations]).to be_an(Array)
      expect(result[:donor_summary]).to be_an(Array)
      expect(result[:project_summary]).to be_an(Array)
    end

    it 'formats donation date as day month year and includes simplified fields' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, name: 'John Doe')
      project = create(:project, title: 'General Fund')
      create(:donation,
             donor: donor,
             project: project,
             amount: 10_000,
             date: Date.new(2025, 3, 12),
             payment_method: 'stripe')

      result = described_class.generate_json_report(start_date: start_date, end_date: end_date)

      first_donation = result[:donations].first
      expect(first_donation[:date]).to eq('12 March 2025')
      expect(first_donation[:donor_name]).to eq('John Doe')
      expect(first_donation[:amount]).to eq('$100.00')
      expect(first_donation[:project_or_child]).to eq('General Fund')
      expect(first_donation[:payment_method]).to eq('stripe')
      expect(first_donation[:all_time_total]).to eq('$100.00')

      # Should NOT include these fields
      expect(first_donation).not_to have_key(:email)
      expect(first_donation).not_to have_key(:phone)
      expect(first_donation).not_to have_key(:address)
      expect(first_donation).not_to have_key(:period_total)
      expect(first_donation).not_to have_key(:year_total)
    end

    it 'includes total_amount in meta for date range' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, name: 'John Doe')
      create(:donation, donor: donor, amount: 10_000, date: Date.new(2025, 3, 12))
      create(:donation, donor: donor, amount: 5_000, date: Date.new(2025, 6, 20))

      result = described_class.generate_json_report(start_date: start_date, end_date: end_date)

      expect(result[:meta][:total_amount]).to eq('$150.00')
    end

    it 'includes donor summary with period and all-time totals' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, name: 'Jane Smith')
      create(:donation, donor: donor, amount: 10_000, date: Date.new(2025, 3, 12))
      create(:donation, donor: donor, amount: 5_000, date: Date.new(2024, 6, 20)) # Previous year

      result = described_class.generate_json_report(start_date: start_date, end_date: end_date)

      donor_row = result[:donor_summary].first
      expect(donor_row[:donor_name]).to eq('Jane Smith')
      expect(donor_row[:period_total]).to eq('$100.00')
      expect(donor_row[:all_time_total]).to eq('$150.00')
    end

    it 'includes project summary with period and all-time totals' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, name: 'Bob Johnson')
      project = create(:project, title: 'General Fund')
      create(:donation, donor: donor, project: project, amount: 10_000, date: Date.new(2025, 3, 12))
      create(:donation, donor: donor, project: project, amount: 5_000, date: Date.new(2024, 6, 20)) # Previous year

      result = described_class.generate_json_report(start_date: start_date, end_date: end_date)

      project_row = result[:project_summary].first
      expect(project_row[:project_name]).to eq('General Fund')
      expect(project_row[:period_total]).to eq('$100.00')
      expect(project_row[:all_time_total]).to eq('$150.00')
    end

    it 'includes project_id in donations for frontend filtering (child sponsorship fix)' do
      start_date = Date.new(2025, 1, 1)
      end_date = Date.new(2025, 12, 31)
      donor = create(:donor, name: 'Jane Smith')
      sponsorship_project = create(:project, title: 'Child Sponsorship', project_type: :sponsorship)
      child = create(:child, name: 'Sangwan')
      sponsorship = create(:sponsorship, child: child, donor: donor)
      create(:donation,
             donor: donor,
             project: sponsorship_project,
             sponsorship: sponsorship,
             amount: 5000,
             date: Date.new(2025, 2, 10),
             payment_method: 'stripe')

      result = described_class.generate_json_report(start_date: start_date, end_date: end_date)

      # Donations should include project_id
      first_donation = result[:donations].first
      expect(first_donation[:project_id]).to eq(sponsorship_project.id)
      expect(first_donation[:project_or_child]).to eq('Sangwan') # Child name, not project title

      # Project summary should include project_id for matching
      project_row = result[:project_summary].first
      expect(project_row[:project_id]).to eq(sponsorship_project.id)
      expect(project_row[:project_name]).to eq('Child Sponsorship') # Project title
    end
  end
end
