## [TICKET-008] Basic Authentication with Google OAuth

**Status:** 📋 Planned
**Priority:** 🔴 High (Security - blocks all other E2E tests)
**Dependencies:** None
**Estimated Effort:** L (8-12 hours)

### User Story
As an admin, I want to log in with Google OAuth using my @projectsforasia.com email so that only authorized organization members can access the donation system.

### Acceptance Criteria

#### Backend (Rails API)
- [ ] Run `bundle install` to install auth gems (devise, omniauth-google-oauth2, omniauth-rails_csrf_protection, jwt)
- [ ] Run Devise generator and configure for API mode
- [ ] Create migration to add OAuth fields to User model (provider, uid, email, name, avatar_url)
- [ ] Update User model with Devise + OmniAuth configuration
- [ ] Validate email domain (@projectsforasia.com) in User model
- [ ] Create AuthController with callback and logout endpoints
- [ ] Reject OAuth callback for non-@projectsforasia.com emails with 403
- [ ] Create JWT token service (encode/decode)
- [ ] Add authentication middleware to ApplicationController
- [ ] Configure CORS for OAuth callback flow
- [ ] Add auth routes: POST /auth/google_oauth2, GET /auth/google_oauth2/callback, DELETE /auth/logout, GET /auth/me
- [ ] RSpec tests for JWT service
- [ ] RSpec request tests for auth endpoints (including domain validation)
- [ ] Factory Bot user factory with OAuth traits

#### Frontend (React)
- [ ] Create AuthContext with login/logout/user state
- [ ] Create API client interceptor to add JWT to requests
- [ ] Create LoginPage with Google OAuth button
- [ ] Create ProtectedRoute wrapper component
- [ ] Update Layout/Navigation with conditional logout button
- [ ] Update App.tsx routes with ProtectedRoute wrapper
- [ ] Handle token expiration and auto-logout
- [ ] Update all 19 existing E2E tests to support authentication
- [ ] Create new E2E test for login/logout flow

#### Infrastructure
- [ ] Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to docker-compose.yml
- [ ] Update .env.example with auth environment variables
- [ ] Document OAuth setup in README or docs/

### Technical Notes

**Current State:**
- User model exists with only `username` field (placeholder from early planning)
- Auth gems already in Gemfile but not installed (`bundle install` needed)
- ApplicationController has global error handling (TICKET-068)
- Frontend uses React Router with Layout/Outlet pattern
- 19 existing E2E tests will ALL need auth token setup

**Implementation Approach:**
1. **Backend Foundation**: Install gems → Devise setup → User model OAuth fields → JWT service
2. **Backend Auth Flow**: AuthController → Middleware → Routes → RSpec tests
3. **Frontend Auth**: AuthContext → LoginPage → ProtectedRoute → API interceptor
4. **E2E Test Updates**: Add auth helper → Update all 19 tests → New auth test
5. **Documentation**: Environment setup → OAuth credentials guide

**Domain Restriction:**
- Only emails ending with `@projectsforasia.com` can authenticate
- Validation enforced at TWO layers:
  1. User model: `validates :email, format: { with: /@projectsforasia\.com\z/ }`
  2. AuthController callback: Check before user creation
- Unauthorized domains return 403 with clear error message
- Test user for E2E: `admin@projectsforasia.com`

**OAuth Flow:**
1. Frontend redirects to `/auth/google_oauth2`
2. User authenticates with Google
3. Google redirects to `/auth/google_oauth2/callback`
4. Backend validates email domain (@projectsforasia.com)
5. Backend creates/finds User, generates JWT, redirects to frontend with token
6. Frontend stores JWT in localStorage, includes in Authorization header
7. Backend middleware validates JWT on protected routes

**JWT Strategy:**
- Store in localStorage (simple, single-user admin app)
- Include in `Authorization: Bearer <token>` header
- Set expiration (e.g., 30 days for admin convenience)
- Refresh token not needed (re-login acceptable for single admin)

**Protected Routes:**
- All `/api/*` routes except:
  - `/api/health` (E2E test infrastructure)
  - `/auth/*` (login/callback/logout)
  - `/rails/health` (Docker health check)

**E2E Test Impact:**
- **All 19 existing tests will break** without auth token
- Create `cypress/support/auth.ts` helper for test login
- Pattern: `beforeEach(() => cy.loginAsAdmin())` for all tests
- Mock OAuth in test environment (use test user seed)

**Environment Variables:**
```
# Google OAuth (production)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret

# JWT Secret (generate with `rails secret`)
JWT_SECRET_KEY=your-jwt-secret
```

**Existing Patterns to Follow:**
- Custom hooks pattern (src/hooks/) for useAuth hook
- Global error handling (ApplicationController rescue_from)
- Presenter pattern for auth responses
- StandardDialog for any auth dialogs
- TDD with strict Red-Green-Refactor

### Files Changed

**Backend (New):**
- `db/migrate/YYYYMMDDHHMMSS_add_oauth_to_users.rb` - OAuth fields migration
- `config/initializers/devise.rb` - Devise + OmniAuth config
- `app/controllers/auth_controller.rb` - OAuth callback + logout + current user
- `app/services/json_web_token.rb` - JWT encode/decode service
- `spec/services/json_web_token_spec.rb` - JWT tests
- `spec/requests/auth_spec.rb` - Auth endpoint tests
- `spec/support/auth_helpers.rb` - Test helper for JWT tokens

**Backend (Modified):**
- `app/models/user.rb` - Add Devise + OmniAuth modules
- `app/controllers/application_controller.rb` - Add `authenticate_user!` method
- `config/routes.rb` - Add auth routes
- `config/initializers/cors.rb` - Update for OAuth flow
- `spec/factories/users.rb` - Add OAuth traits
- `db/seeds.rb` - Add test user for development
- `docker-compose.yml` - Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET_KEY

**Frontend (New):**
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/hooks/useAuth.ts` - Auth hook (follows TICKET-032 pattern)
- `src/pages/LoginPage.tsx` - Login UI with Google button
- `src/components/ProtectedRoute.tsx` - Route wrapper for auth check
- `src/utils/api-client-interceptors.ts` - JWT header injection
- `cypress/support/auth.ts` - E2E auth helper
- `cypress/e2e/authentication.cy.ts` - Login/logout E2E test

**Frontend (Modified):**
- `src/App.tsx` - Wrap routes in AuthProvider and ProtectedRoute
- `src/components/Layout.tsx` - Add conditional logout button
- `src/components/Navigation.tsx` - Show user info when logged in
- `src/utils/api-client.ts` - Add request/response interceptors
- All 19 `cypress/e2e/*.cy.ts` files - Add `cy.loginAsAdmin()` in beforeEach

**Documentation:**
- `.env.example` - Add auth environment variables
- `docs/AUTHENTICATION.md` (optional) - OAuth setup guide

### Related Commits
- (To be added during commit)
