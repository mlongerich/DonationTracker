require 'rails_helper'

RSpec.describe ProjectPresenter do
  describe "#as_json" do
    it "includes project id" do
      project = create(:project)
      presenter = described_class.new(project)

      json = presenter.as_json

      expect(json[:id]).to eq(project.id)
    end

    it "returns donations_count" do
      project = create(:project)
      donor = create(:donor)
      create_list(:donation, 3, project: project, donor: donor)
      presenter = described_class.new(project)

      json = presenter.as_json

      expect(json[:donations_count]).to eq(3)
    end

    it "returns sponsorships_count" do
      project = create(:project, project_type: :sponsorship)
      child = create(:child)
      donor1 = create(:donor)
      donor2 = create(:donor)
      create(:sponsorship, project: project, child: child, donor: donor1, monthly_amount: 100)
      create(:sponsorship, project: project, child: child, donor: donor2, monthly_amount: 100)
      presenter = described_class.new(project)

      json = presenter.as_json

      expect(json[:sponsorships_count]).to eq(2)
    end

    it "returns can_be_deleted true when no associations" do
      project = create(:project, system: false)
      presenter = described_class.new(project)

      json = presenter.as_json

      expect(json[:can_be_deleted]).to be true
    end

    it "returns can_be_deleted false when donations exist" do
      project = create(:project, system: false)
      donor = create(:donor)
      create(:donation, project: project, donor: donor)
      presenter = described_class.new(project)

      json = presenter.as_json

      expect(json[:can_be_deleted]).to be false
    end

    it "includes discarded_at field when project is archived" do
      project = create(:project)
      project.discard

      presenter = described_class.new(project)
      json = presenter.as_json

      expect(json).to have_key(:discarded_at)
      expect(json[:discarded_at]).to be_present
    end
  end
end
