class SponsorshipPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      donor_id: object.donor_id,
      donor_name: object.donor&.name,
      child_id: object.child_id,
      child_name: object.child&.name,
      monthly_amount: object.monthly_amount.to_s,
      active: object.active?,
      end_date: object.end_date,
      created_at: object.created_at,
      project_id: object.project_id,
      start_date: object.start_date,
      project_title: object.project&.title
    }
  end
end
