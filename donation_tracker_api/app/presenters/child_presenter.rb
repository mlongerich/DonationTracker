class ChildPresenter < BasePresenter
  def as_json(options = {})
    {
      id: object.id,
      name: object.name,
      created_at: object.created_at,
      updated_at: object.updated_at,
      can_be_deleted: object.can_be_deleted?
    }
  end
end
