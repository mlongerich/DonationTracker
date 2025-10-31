require 'rails_helper'

RSpec.describe Sponsorship, type: :model do
  describe "associations" do
    it "belongs to donor" do
      expect(Sponsorship.new).to respond_to(:donor)
    end

    it "belongs to child" do
      expect(Sponsorship.new).to respond_to(:child)
    end

    it "belongs to project" do
      expect(Sponsorship.new).to respond_to(:project)
    end

    it "has many donations" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child)
      donation = create(:donation, donor: donor, sponsorship: sponsorship)

      expect(sponsorship.donations).to include(donation)
    end
  end

  describe "validations" do
    it "requires monthly_amount" do
      sponsorship = Sponsorship.new(monthly_amount: nil)
      expect(sponsorship).not_to be_valid
      expect(sponsorship.errors[:monthly_amount]).to include("can't be blank")
    end

    it "does not allow negative monthly_amount" do
      sponsorship = Sponsorship.new(monthly_amount: -10)
      expect(sponsorship).not_to be_valid
      expect(sponsorship.errors[:monthly_amount]).to include("must be greater than or equal to 0")
    end

    it "allows monthly_amount of 0 for auto-created sponsorships" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = Sponsorship.new(donor: donor, child: child, monthly_amount: 0)
      expect(sponsorship).to be_valid
    end

    it "allows start_date attribute" do
      donor = create(:donor)
      child = create(:child)
      start_date = Date.new(2025, 1, 15)

      sponsorship = Sponsorship.create!(
        donor: donor,
        child: child,
        monthly_amount: 50,
        start_date: start_date
      )

      expect(sponsorship.start_date).to eq(start_date)
    end

    describe "uniqueness validation" do
      let(:donor) { create(:donor) }
      let(:child) { create(:child) }

      it "prevents duplicate active sponsorships with same donor, child, and amount" do
        # Create first active sponsorship
        create(:sponsorship, donor: donor, child: child, monthly_amount: 50, end_date: nil)

        # Attempt to create duplicate
        duplicate = Sponsorship.new(donor: donor, child: child, monthly_amount: 50, end_date: nil)
        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:base]).to include("#{child.name} is already actively sponsored by #{donor.name}")
      end

      it "allows creating sponsorship if previous one ended" do
        # Create ended sponsorship
        create(:sponsorship, donor: donor, child: child, monthly_amount: 50, end_date: Date.yesterday)

        # Should allow new sponsorship with same details
        new_sponsorship = Sponsorship.new(donor: donor, child: child, monthly_amount: 50, end_date: nil)
        expect(new_sponsorship).to be_valid
      end

      it "allows creating sponsorship with different donor" do
        # Create sponsorship with original donor
        create(:sponsorship, donor: donor, child: child, monthly_amount: 50, end_date: nil)

        # Should allow same child and amount with different donor
        other_donor = create(:donor)
        different_donor_sponsorship = Sponsorship.new(donor: other_donor, child: child, monthly_amount: 50, end_date: nil)
        expect(different_donor_sponsorship).to be_valid
      end

      it "allows creating sponsorship with different child" do
        # Create sponsorship with original child
        create(:sponsorship, donor: donor, child: child, monthly_amount: 50, end_date: nil)

        # Should allow same donor and amount with different child
        other_child = create(:child)
        different_child_sponsorship = Sponsorship.new(donor: donor, child: other_child, monthly_amount: 50, end_date: nil)
        expect(different_child_sponsorship).to be_valid
      end
    end
  end

  describe "scopes" do
    it "returns active sponsorships when end_date is null" do
      expect(Sponsorship).to respond_to(:active)
    end
  end

  describe "#active?" do
    it "returns true when end_date is nil" do
      sponsorship = Sponsorship.new(end_date: nil)
      expect(sponsorship.active?).to be true
    end
  end

  describe "callbacks" do
    it "auto-creates a sponsorship project after creation" do
      donor = create(:donor)
      child = create(:child, name: "Maria")

      sponsorship = Sponsorship.create!(
        donor: donor,
        child: child,
        monthly_amount: 50
      )

      expect(sponsorship.project).to be_present
      expect(sponsorship.project.project_type).to eq("sponsorship")
      expect(sponsorship.project.title).to eq("Sponsor Maria")
      expect(sponsorship.project.system).to eq(false)
    end

    describe "project reuse" do
      let(:donor) { create(:donor) }
      let(:child) { create(:child, name: "Ana") }

      it "creates new project for first sponsorship of a child" do
        initial_project_count = Project.count

        sponsorship = Sponsorship.create!(
          donor: donor,
          child: child,
          monthly_amount: 50
        )

        expect(Project.count).to eq(initial_project_count + 1)
        expect(sponsorship.project).to be_present
        expect(sponsorship.project.title).to eq("Sponsor Ana")
      end

      it "reuses existing project for second sponsorship of same child" do
        # First sponsorship creates project
        first_sponsorship = Sponsorship.create!(
          donor: donor,
          child: child,
          monthly_amount: 50
        )
        first_project = first_sponsorship.project

        # Second sponsorship with different donor should reuse project
        other_donor = create(:donor)
        second_sponsorship = Sponsorship.create!(
          donor: other_donor,
          child: child,
          monthly_amount: 50
        )

        expect(second_sponsorship.project_id).to eq(first_project.id)
        expect(Project.where(project_type: :sponsorship, title: "Sponsor Ana").count).to eq(1)
      end

      it "multiple sponsorships share same project for a child" do
        # Create three sponsorships for same child with different donors
        donor1 = create(:donor)
        donor2 = create(:donor)
        donor3 = create(:donor)

        sponsorship1 = Sponsorship.create!(donor: donor1, child: child, monthly_amount: 50)
        sponsorship2 = Sponsorship.create!(donor: donor2, child: child, monthly_amount: 75)
        sponsorship3 = Sponsorship.create!(donor: donor3, child: child, monthly_amount: 100)

        # All should share the same project
        expect(sponsorship1.project_id).to eq(sponsorship2.project_id)
        expect(sponsorship2.project_id).to eq(sponsorship3.project_id)
        expect(Project.where(project_type: :sponsorship, title: "Sponsor Ana").count).to eq(1)
      end
    end
  end

  describe "#calculated_start_date" do
    it "returns earliest donation date when donations exist" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child, start_date: nil)

      create(:donation, donor: donor, sponsorship: sponsorship, date: Date.new(2025, 3, 15))
      create(:donation, donor: donor, sponsorship: sponsorship, date: Date.new(2025, 1, 10))
      create(:donation, donor: donor, sponsorship: sponsorship, date: Date.new(2025, 2, 20))

      expect(sponsorship.calculated_start_date).to eq(Date.new(2025, 1, 10))
    end

    it "returns start_date when no donations exist" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child, start_date: Date.new(2025, 5, 1))

      expect(sponsorship.calculated_start_date).to eq(Date.new(2025, 5, 1))
    end

    it "returns created_at date when no donations and no start_date" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child, start_date: nil)

      expect(sponsorship.calculated_start_date).to eq(sponsorship.created_at.to_date)
    end
  end

  describe "auto-unarchive associations" do
    it "restores archived donor, child, and project when creating sponsorship" do
      donor = create(:donor)
      child = create(:child)
      project = create(:project, project_type: :sponsorship)

      donor.discard
      child.discard
      project.discard

      expect(donor.discarded?).to be true
      expect(child.discarded?).to be true
      expect(project.discarded?).to be true

      sponsorship = Sponsorship.create!(
        donor: donor,
        child: child,
        project: project,
        monthly_amount: 100
      )

      expect(donor.reload.discarded?).to be false
      expect(child.reload.discarded?).to be false
      expect(project.reload.discarded?).to be false
      expect(sponsorship.donor).to eq(donor)
      expect(sponsorship.child).to eq(child)
      expect(sponsorship.project).to eq(project)
    end
  end
end
