require 'rails_helper'

RSpec.describe Project, type: :model do
  describe "validations" do
    it "requires a title" do
      project = build(:project, title: nil)
      expect(project).not_to be_valid
      expect(project.errors[:title]).to include("can't be blank")
    end

    it "requires a unique title" do
      create(:project, title: "Unique Project")
      duplicate_project = build(:project, title: "Unique Project")
      expect(duplicate_project).not_to be_valid
      expect(duplicate_project.errors[:title]).to include("has already been taken")
    end

    it "allows updating project with same title" do
      project = create(:project, title: "Original Title")
      project.description = "Updated description"
      expect(project).to be_valid
      expect(project.save).to be true
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

  describe "archive restrictions for active sponsorships" do
    it "cannot archive project with active sponsorships" do
      project = create(:project, project_type: :sponsorship)
      child = create(:child)
      donor = create(:donor)
      create(:sponsorship, project: project, child: child, donor: donor, monthly_amount: 100, end_date: nil)

      expect(project.discard).to be false
      expect(project.errors[:base]).to include("Cannot archive project with active sponsorships")
      expect(project.discarded?).to be false
    end

    it "can archive project with no active sponsorships" do
      project = create(:project)

      expect(project.discard).to be true
      expect(project.discarded?).to be true
    end
  end

  describe "Ransack security whitelists" do
    describe ".ransackable_attributes" do
      it "returns whitelisted attributes for search" do
        expected_attributes = %w[title project_type description system created_at updated_at discarded_at]

        expect(Project.ransackable_attributes).to match_array(expected_attributes)
      end

      it "prevents searching on non-whitelisted attributes" do
        non_whitelisted = %w[id]

        non_whitelisted.each do |attr|
          expect(Project.ransackable_attributes).not_to include(attr)
        end
      end
    end

    describe ".ransackable_associations" do
      it "returns whitelisted associations for search" do
        expected_associations = %w[donations sponsorships]

        expect(Project.ransackable_associations).to match_array(expected_associations)
      end
    end
  end
end
