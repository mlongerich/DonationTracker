class DonationPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      amount: object.amount,
      date: object.date,
      donor_id: object.donor_id,
      donor_name: object.donor.name,
      project_id: object.project_id,
      project_title: object.project&.title || "General Donation",
      status: object.status,
      description: object.description,
      created_at: object.created_at,
      updated_at: object.updated_at
    }
  end
end
