## [TICKET-136] Production Google OAuth Setup

**Status:** ⏸️ Blocked by TICKET-137
**Priority:** 🔴 High
**Category:** Infrastructure / Deployment
**Dependencies:** TICKET-137 (Production Infrastructure - needs production domain)
**Related:** TICKET-008 (Google OAuth Authentication) ✅ Complete

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
