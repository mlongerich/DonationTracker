require 'rails_helper'

RSpec.describe Child, type: :model do
  describe "validations" do
    it "requires a name" do
      child = Child.new(name: nil)
      expect(child).not_to be_valid
      expect(child.errors[:name]).to include("can't be blank")
    end
  end

  describe "associations" do
    it "has many sponsorships" do
      expect(Child.new).to respond_to(:sponsorships)
    end

    it "has many donors through sponsorships" do
      expect(Child.new).to respond_to(:donors)
    end
  end

  describe "association behavior" do
    it "returns associated sponsorships" do
      child = Child.create!(name: "Test Child")
      expect(child.sponsorships).to eq([])
    end
  end
end
