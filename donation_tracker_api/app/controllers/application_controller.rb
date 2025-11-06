# frozen_string_literal: true

# Base controller for all API endpoints with global error handling.
#
# Provides consistent error responses across all controllers:
# - 404 for ActiveRecord::RecordNotFound
# - 422 for ActiveRecord::RecordInvalid (validation errors)
# - 400 for ActionController::ParameterMissing
#
# All controllers inherit from this to ensure uniform error handling
# and eliminate the need for if/else blocks in controller actions.
#
# @example Controller usage pattern
#   class Api::DonorsController < ApplicationController
#     def create
#       donor = Donor.new(donor_params)
#       donor.save!  # Raises RecordInvalid if validation fails
#       render json: { donor: DonorPresenter.new(donor).as_json }
#     end
#   end
#
# @see TICKET-068 for global error handling implementation
class ApplicationController < ActionController::API
  # Global exception handlers for consistent error responses
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :render_bad_request

  private

  def render_not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def render_unprocessable_entity(exception)
    render json: {
      errors: exception.record.errors.full_messages
    }, status: :unprocessable_entity
  end

  def render_bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end
end
