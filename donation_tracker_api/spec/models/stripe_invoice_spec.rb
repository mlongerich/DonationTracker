require 'rails_helper'

RSpec.describe StripeInvoice, type: :model do
  describe 'validations' do
    it 'is valid with all required attributes' do
      invoice = StripeInvoice.new(
        stripe_invoice_id: 'inv_123',
        stripe_charge_id: 'ch_456',
        total_amount_cents: 10000,
        invoice_date: Date.today
      )
      expect(invoice).to be_valid
    end

    it 'is invalid without stripe_invoice_id' do
      invoice = StripeInvoice.new(
        stripe_charge_id: 'ch_456',
        total_amount_cents: 10000,
        invoice_date: Date.today
      )
      expect(invoice).not_to be_valid
      expect(invoice.errors[:stripe_invoice_id]).to include("can't be blank")
    end

    it 'is invalid without stripe_charge_id' do
      invoice = StripeInvoice.new(
        stripe_invoice_id: 'inv_123',
        total_amount_cents: 10000,
        invoice_date: Date.today
      )
      expect(invoice).not_to be_valid
      expect(invoice.errors[:stripe_charge_id]).to include("can't be blank")
    end

    it 'is invalid without total_amount_cents' do
      invoice = StripeInvoice.new(
        stripe_invoice_id: 'inv_123',
        stripe_charge_id: 'ch_456',
        invoice_date: Date.today
      )
      expect(invoice).not_to be_valid
      expect(invoice.errors[:total_amount_cents]).to include("can't be blank")
    end

    it 'is invalid without invoice_date' do
      invoice = StripeInvoice.new(
        stripe_invoice_id: 'inv_123',
        stripe_charge_id: 'ch_456',
        total_amount_cents: 10000
      )
      expect(invoice).not_to be_valid
      expect(invoice.errors[:invoice_date]).to include("can't be blank")
    end
  end

  describe 'associations' do
    it 'has many donations' do
      invoice = StripeInvoice.create!(
        stripe_invoice_id: 'inv_test',
        stripe_charge_id: 'ch_test',
        total_amount_cents: 10000,
        invoice_date: Date.today
      )

      donor = create(:donor)
      project = create(:project)

      donation1 = create(:donation, :stripe,
        donor: donor,
        project: project,
        amount: 5000,
        stripe_invoice_id: 'inv_test'
      )

      donation2 = create(:donation, :stripe,
        donor: donor,
        project: project,
        amount: 5000,
        stripe_invoice_id: 'inv_test'
      )

      expect(invoice.donations.count).to eq(2)
      expect(invoice.donations).to include(donation1, donation2)
    end
  end

  describe 'uniqueness' do
    it 'enforces unique stripe_invoice_id' do
      StripeInvoice.create!(
        stripe_invoice_id: 'inv_duplicate',
        stripe_charge_id: 'ch_123',
        total_amount_cents: 10000,
        invoice_date: Date.today
      )

      duplicate = StripeInvoice.new(
        stripe_invoice_id: 'inv_duplicate',
        stripe_charge_id: 'ch_456',
        total_amount_cents: 20000,
        invoice_date: Date.today
      )

      expect { duplicate.save! }.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end
end
