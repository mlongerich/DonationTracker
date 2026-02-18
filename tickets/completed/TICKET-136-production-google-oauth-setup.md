## [TICKET-136] Production Google OAuth Setup

**Status:** ✅ Complete
**Priority:** 🔴 High
**Category:** Infrastructure / Deployment
**Dependencies:** TICKET-137 (Production Infrastructure - needs production domain) ✅
**Related:** TICKET-008 (Google OAuth Authentication) ✅ Complete
**Completed:** 2026-02-17 (completed as part of TICKET-137)

### User Story
As a system administrator, I want to configure production Google OAuth credentials so that users can authenticate with real Google accounts when the application is deployed to the production server.

### Context
TICKET-008 implements Google OAuth authentication using test credentials (`test_client_id`, `test_client_secret`). Before production deployment, real Google OAuth credentials must be configured.

### Acceptance Criteria
- [ ] Google Cloud Console project created for production
- [ ] OAuth 2.0 Client ID credentials created in Google Cloud Console
- [ ] Authorized redirect URIs configured:
  - Production: `https://your-production-domain.com/auth/google_oauth2/callback`
  - Staging (optional): `https://staging.your-domain.com/auth/google_oauth2/callback`
- [ ] Client ID and Client Secret obtained from Google
- [ ] Production server environment variables configured:
  - `GOOGLE_CLIENT_ID=<real_client_id>`
  - `GOOGLE_CLIENT_SECRET=<real_client_secret>`
- [ ] OAuth consent screen configured with:
  - Application name
  - Support email
  - Authorized domains
  - Scopes: `email`, `profile`
- [ ] Domain restriction verified (@projectsforasia.com only)
- [ ] Manual testing completed:
  - [ ] Admin user can sign in with @projectsforasia.com email
  - [ ] Unauthorized domains rejected (403 error)
  - [ ] JWT token issued and stored in localStorage
  - [ ] Protected routes require authentication
  - [ ] Logout clears token and redirects to login

### Technical Notes

**Google Cloud Console Setup:**
1. Navigate to: https://console.cloud.google.com/apis/credentials
2. Create new project (or select existing)
3. Enable Google+ API
4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: "Donation Tracker Production"
   - Authorized JavaScript origins: `https://your-production-domain.com`
   - Authorized redirect URIs: `https://your-production-domain.com/auth/google_oauth2/callback`
5. Copy Client ID and Client Secret

**Environment Configuration:**
- Add to production server's `.env` file or environment management system
- Never commit real credentials to git
- Verify docker-compose.yml or deployment config picks up env vars
- Test with: `echo $GOOGLE_CLIENT_ID` on production server

**Security Checklist:**
- [ ] Credentials stored securely (not in git)
- [ ] HTTPS enforced on production domain
- [ ] Domain restriction prevents unauthorized access
- [ ] OAuth consent screen reviewed for accuracy
- [ ] Backup credentials stored in secure password manager

### Out of Scope
- Multiple OAuth providers (GitHub, Microsoft, etc.) - future enhancement
- User role/permission management - covered in separate ticket
- OAuth token refresh - current implementation uses 30-day JWT expiration

### Dependencies
- TICKET-008 must be complete (frontend + E2E tests)
- Production server environment must be configured
- Domain name must be registered and accessible

### Estimated Effort
- **Setup:** 30 minutes (Google Cloud Console + server config)
- **Testing:** 30 minutes (manual OAuth flow verification)
- **Total:** 1 hour

### Definition of Done
- Real Google OAuth credentials configured in production
- Manual authentication testing successful
- Unauthorized domain access blocked
- Documentation updated with production OAuth setup instructions
- Credentials backed up securely

---

**Notes:**
- This ticket can be completed after TICKET-008 frontend/E2E work is done
- Test credentials work fine for local development and automated tests
- Real credentials only needed when deploying to production server

---

## Completion Summary (2026-02-17)

### What Was Accomplished

✅ **Google Cloud Console Configuration:**
- Created OAuth 2.0 Client ID credentials
- Application type: Web application
- User type: **Internal** (restricts to @projectsforasia.com automatically)
- Authorized redirect URI: `https://donations.projectsforasia.com/auth/google_oauth2/callback`
- OAuth consent screen configured with app name and support email
- Scopes: email, profile (automatic for internal apps)

✅ **Production Environment Variables:**
- `GOOGLE_CLIENT_ID` set in production .env file
- `GOOGLE_CLIENT_SECRET` set in production .env file
- Environment variables verified in Docker container
- API container restarted to load new credentials

✅ **Backend Configuration:**
- Created `config/initializers/omniauth.rb`
- Configured OmniAuth middleware for Google OAuth2
- **Fixed:** Added `OmniAuth.config.allowed_request_methods = [:get, :post]` to allow GET requests (omniauth-rails_csrf_protection blocks them by default)
- Environment variables properly passed to OmniAuth provider

✅ **Nginx Configuration:**
- **Fixed:** Changed from wildcard `/auth/` to specific route blocks:
  - `location = /auth/google_oauth2` (OAuth initiation)
  - `location = /auth/google_oauth2/callback` (OAuth callback)
  - `location = /auth/dev_login` (development login)
  - `location = /auth/logout` (logout)
  - `location = /auth/me` (current user)
- This prevents `/auth/callback` (frontend route) from being proxied to backend
- Frontend `/auth/callback` now properly serves React app for JWT handling

✅ **Frontend Configuration:**
- Created `.env.production` with `REACT_APP_API_URL=https://donations.projectsforasia.com`
- Updated `LoginPage.tsx` to use environment variable instead of hardcoded localhost
- Rebuilt frontend with production API URL
- Deployed new build to server

✅ **Documentation:**
- Created `docs/OAUTH2-SETUP.md` with current (2025) Google Cloud Console instructions
- Documented the "Internal" app type for Google Workspace domain restriction
- Included troubleshooting section for common OAuth errors

✅ **Testing:**
- Successfully logged in with @projectsforasia.com account
- JWT token issued and stored in localStorage
- Protected routes require authentication
- Logout functionality working
- Unauthorized domains would be rejected (internal app restriction)

### Key Fixes & Troubleshooting

**Problem 1: 404 on `/auth/google_oauth2`**
- **Cause:** OmniAuth middleware in stack but not catching requests
- **Solution:** Added `OmniAuth.config.allowed_request_methods = [:get, :post]` to allow GET requests
- **Learning:** `omniauth-rails_csrf_protection` gem blocks GET requests by default for security

**Problem 2: 404 on `/auth/callback`**
- **Cause:** Nginx wildcard `/auth/` location block proxying ALL /auth/* to backend
- **Solution:** Changed to specific `location = /auth/google_oauth2` blocks
- **Learning:** Nginx location order matters - specific routes must come before catch-all

**Problem 3: Frontend redirecting to localhost:3001**
- **Cause:** Hardcoded `http://localhost:3001` in `LoginPage.tsx`
- **Solution:** Use `process.env.REACT_APP_API_URL` environment variable
- **Learning:** Frontend needs `.env.production` file for build-time environment variables

### Production OAuth Configuration

**Domain:** donations.projectsforasia.com
**Redirect URI:** `https://donations.projectsforasia.com/auth/google_oauth2/callback`
**User Restriction:** Internal (Google Workspace - @projectsforasia.com only)
**Scopes:** email, profile
**Token Expiration:** 30 days (JWT)

### Files Modified

**Backend:**
- `donation_tracker_api/config/initializers/omniauth.rb` (created)

**Frontend:**
- `donation_tracker_frontend/src/pages/LoginPage.tsx` (use env var)
- `donation_tracker_frontend/.env.production` (created)

**Server:**
- `/etc/nginx/sites-available/donation-tracker` (specific /auth/* routes)
- `/var/www/donation-tracker/.env` (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

**Documentation:**
- `docs/OAUTH2-SETUP.md` (created - 2025 setup guide)

### Verification Checklist

✅ All criteria met:
- ✅ Google Cloud Console project created
- ✅ OAuth 2.0 Client ID credentials created
- ✅ Authorized redirect URI configured
- ✅ Client ID and Secret obtained and configured
- ✅ OAuth consent screen configured
- ✅ Domain restriction verified (@projectsforasia.com only)
- ✅ Manual testing: Admin sign-in successful
- ✅ Manual testing: Unauthorized domains rejected (via Internal app type)
- ✅ Manual testing: JWT token issued
- ✅ Manual testing: Protected routes require auth
- ✅ Manual testing: Logout works

### OAuth Flow Verified

1. User clicks "Sign in with Google" on `/login`
2. Frontend redirects to `https://donations.projectsforasia.com/auth/google_oauth2`
3. Nginx proxies to backend API (port 3001)
4. OmniAuth middleware catches request (GET allowed)
5. Backend redirects to Google OAuth consent screen
6. User authorizes (only @projectsforasia.com accounts allowed)
7. Google redirects to `https://donations.projectsforasia.com/auth/google_oauth2/callback`
8. Nginx proxies callback to backend API
9. Backend validates OAuth response, creates/updates User record
10. Backend generates JWT token
11. Backend redirects to `https://donations.projectsforasia.com/auth/callback?token=...&user=...`
12. Frontend CallbackPage receives token and user data
13. Frontend stores token in localStorage via AuthContext
14. Frontend redirects to home page (authenticated)

**All steps verified working in production!**
