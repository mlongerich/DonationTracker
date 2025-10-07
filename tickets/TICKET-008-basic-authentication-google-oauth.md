## [TICKET-008] Basic Authentication with Google OAuth

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** None

### User Story
As an admin, I want to log in with Google OAuth so that only authorized users can access the donation system.

### Acceptance Criteria
- [ ] Backend: Update User model with Google OAuth fields (provider, uid, token)
- [ ] Backend: Configure Devise + OmniAuth Google OAuth2
- [ ] Backend: POST /auth/google_oauth2/callback endpoint
- [ ] Backend: DELETE /auth/logout endpoint
- [ ] Backend: Authentication middleware for protected routes
- [ ] Backend: Return JWT token on successful login
- [ ] Frontend: Login page with "Sign in with Google" button
- [ ] Frontend: Auth context/provider to store user state
- [ ] Frontend: Protected routes (redirect to login if not authenticated)
- [ ] Frontend: Logout button in header
- [ ] RSpec tests for auth flows
- [ ] Cypress E2E test for login/logout flow

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Gems**: devise, omniauth-google-oauth2, omniauth-rails_csrf_protection, jwt (already in Gemfile)
- **OAuth setup**: Google Cloud Console credentials needed
- **JWT**: Store in localStorage, include in Authorization header
- **Protected routes**: All /api/* except /auth/* require authentication
- **Env vars**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### Files Changed
- Backend: `app/models/user.rb` (update)
- Backend: `config/initializers/devise.rb` (configure OAuth)
- Backend: `app/controllers/auth_controller.rb` (new)
- Backend: `app/middleware/authenticate_request.rb` (new)
- Backend: `spec/requests/auth_spec.rb` (new)
- Frontend: `src/contexts/AuthContext.tsx` (new)
- Frontend: `src/pages/Login.tsx` (new)
- Frontend: `src/components/ProtectedRoute.tsx` (new)
- Frontend: `cypress/e2e/authentication.cy.ts` (new)

### Related Commits
- (To be added during commit)
