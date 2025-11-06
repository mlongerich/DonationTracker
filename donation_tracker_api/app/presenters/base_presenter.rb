# frozen_string_literal: true

# Base presenter class for formatting model objects as JSON.
#
# All presenters inherit from this class to establish the standard
# as_json interface pattern for API responses.
#
# Subclasses must implement the as_json method to define their
# specific JSON structure.
#
# @example Create a custom presenter
#   class UserPresenter < BasePresenter
#     def as_json(options = {})
#       { id: object.id, name: object.name }
#     end
#   end
#
# @see CollectionPresenter for collection formatting
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
