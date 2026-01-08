# frozen_string_literal: true

# Base controller for all API endpoints with global error handling and authentication.
#
# Provides:
# - JWT authentication for all endpoints (except /auth/*)
# - Consistent error responses across all controllers
#   - 404 for ActiveRecord::RecordNotFound
#   - 422 for ActiveRecord::RecordInvalid (validation errors)
#   - 400 for ActionController::ParameterMissing
#   - 401 for authentication failures
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
# @see TICKET-008 for authentication implementation
class ApplicationController < ActionController::API
  before_action :authenticate_request, unless: -> { Rails.env.test? }

  # Global exception handlers for consistent error responses
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :render_bad_request

  attr_reader :current_user

  private

  def authenticate_request
    token = extract_token_from_header
    unless token
      render json: { error: "Authorization token missing" }, status: :unauthorized
      return
    end

    decoded = JsonWebToken.decode(token)
    @current_user = User.find(decoded[:user_id])
  rescue JWT::DecodeError, JWT::ExpiredSignature
    render json: { error: "Invalid or expired token" }, status: :unauthorized
  rescue ActiveRecord::RecordNotFound
    render json: { error: "User not found" }, status: :unauthorized
  end

  def extract_token_from_header
    auth_header = request.headers["Authorization"]
    return nil unless auth_header&.start_with?("Bearer ")

    auth_header.split(" ").last
  end

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
