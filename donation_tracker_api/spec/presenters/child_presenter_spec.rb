require 'rails_helper'

RSpec.describe ChildPresenter do
  describe "#as_json" do
    it "includes child id" do
      child = create(:child)
      presenter = described_class.new(child)

      json = presenter.as_json

      expect(json[:id]).to eq(child.id)
    end

    it "includes child name" do
      child = create(:child, name: "Test Child")
      presenter = described_class.new(child)

      json = presenter.as_json

      expect(json[:name]).to eq("Test Child")
    end

    it "returns can_be_deleted true when no sponsorships" do
      child = create(:child)
      presenter = described_class.new(child)

      json = presenter.as_json

      expect(json[:can_be_deleted]).to be true
    end

    it "returns can_be_deleted false when sponsorships exist" do
      child = create(:child)
      donor = create(:donor)
      create(:sponsorship, child: child, donor: donor)
      presenter = described_class.new(child)

      json = presenter.as_json

      expect(json[:can_be_deleted]).to be false
    end
  end
end
