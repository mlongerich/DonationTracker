class ProjectPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      title: object.title,
      description: object.description,
      project_type: object.project_type,
      system: object.system,
      donations_count: object.donations.count,
      sponsorships_count: object.sponsorships.count,
      can_be_deleted: object.can_be_deleted?  # UNCOMMENTED - test passed!
    }
  end
end
