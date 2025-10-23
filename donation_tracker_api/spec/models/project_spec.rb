require 'rails_helper'

RSpec.describe Project, type: :model do
  describe "validations" do
    it "requires a title" do
      project = build(:project, title: nil)
      expect(project).not_to be_valid
      expect(project.errors[:title]).to include("can't be blank")
    end

    it "prevents deletion of system projects" do
      system_project = create(:project, title: "System Project", system: true)
      system_project.destroy
      expect(system_project.errors[:base]).to include("Cannot delete system projects")
    end
  end

  describe "enums" do
    it "defines project_type enum with general" do
      project = build(:project, title: "Test", project_type: :general)
      expect(project.project_type).to eq("general")
    end
  end

  describe "associations" do
    it "has many donations" do
      expect(Project.reflect_on_association(:donations).macro).to eq(:has_many)
    end

    it "has many sponsorships" do
      expect(Project.new).to respond_to(:sponsorships)
    end

    it "restricts deletion when donations exist" do
      project = create(:project)
      create(:donation, project: project)

      expect { project.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "restricts deletion when sponsorships exist" do
      project = create(:project, project_type: :sponsorship)
      child = create(:child)
      donor = create(:donor)
      create(:sponsorship, project: project, child: child, donor: donor, monthly_amount: 100)

      expect { project.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "allows deletion when no donations or sponsorships exist" do
      project = create(:project)

      expect { project.destroy }.to change(Project, :count).by(-1)
    end
  end

  describe "#can_be_deleted?" do
    it "returns true when project has no associations and is not system" do
      project = create(:project, system: false)
      expect(project.can_be_deleted?).to be true
    end

    it "returns false when project has donations" do
      project = create(:project)
      create(:donation, project: project)
      expect(project.can_be_deleted?).to be false
    end

    it "returns false when project has sponsorships" do
      project = create(:project, project_type: :sponsorship)
      child = create(:child)
      donor = create(:donor)
      create(:sponsorship, project: project, child: child, donor: donor, monthly_amount: 100)
      expect(project.can_be_deleted?).to be false
    end

    it "returns false when project is system" do
      project = create(:project, system: true)
      expect(project.can_be_deleted?).to be false
    end
  end
end
