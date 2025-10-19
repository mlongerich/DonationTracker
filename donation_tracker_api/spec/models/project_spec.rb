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
  end
end
