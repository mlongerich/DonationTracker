class BasePresenter
  def initialize(object, options = {})
    @object = object
    @options = options
  end

  def as_json(options = {})
    raise NotImplementedError, "Subclasses must implement as_json"
  end

  private

  attr_reader :object, :options
end
