# Google OAuth2 Setup Guide (2025)

**Google Workspace Internal Application Setup**

This guide provides current (2025) instructions for setting up Google OAuth2 authentication for the Donation Tracker application, restricted to @projectsforasia.com email addresses.

---

## Prerequisites

- Google Workspace account with admin access
- Domain: projectsforasia.com
- Production URL: https://donations.projectsforasia.com
- Application already deployed with OAuth callback endpoint configured

---

## Step 1: Create/Select Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown in the top bar
3. Click **New Project**
4. **Project name:** "Donation Tracker" (or your preferred name)
5. **Organization:** Select your Google Workspace organization (if applicable)
6. Click **Create**
7. Wait for project creation, then select the new project

---

## Step 2: Configure OAuth Consent Screen

### Navigate to Consent Screen

**Option A (New 2025 Interface):**
- Navigate to: **Menu (☰) → Google Auth platform → Branding**

**Option B (Classic Interface):**
- Navigate to: **Menu (☰) → APIs & Services → OAuth consent screen**

### Configure Settings

1. **Click "Get Started"** (if configuring for the first time)

2. **Select User Type:**
   - Choose **Internal** ⭐ **IMPORTANT**
   - This automatically restricts access to @projectsforasia.com users only
   - Click **Next**

3. **App Information:**
   - **App name:** `Donation Tracker`
   - **User support email:** Select your admin email (e.g., `admin@projectsforasia.com`)
   - **App logo:** (Optional) Upload logo if desired
   - Click **Next**

4. **Scopes:**
   - **No scopes needed for basic authentication** (profile, email are automatic)
   - Click **Next** to skip

5. **Contact Information:**
   - **Developer contact email:** Enter admin email (e.g., `admin@projectsforasia.com`)
   - Click **Next**

6. **Summary and Review:**
   - Review your settings
   - Check: **"I agree to the Google API Services: User Data Policy"**
   - Click **Continue**
   - Click **Create**

✅ **Key Benefit:** Internal apps are automatically restricted to your Google Workspace domain and do NOT require Google verification!

---

## Step 3: Create OAuth Client ID Credentials

### Navigate to Credentials

**Option A (New 2025 Interface):**
- Navigate to: **Menu (☰) → Google Auth platform → Clients**

**Option B (Classic Interface):**
- Navigate to: **Menu (☰) → APIs & Services → Credentials**

### Create Client

1. Click **Create Client** (or **Create Credentials → OAuth client ID**)

2. **Application type:** Select **Web application**

3. **Name:** `Donation Tracker Production`
   - This name is only visible in Google Cloud Console

4. **Authorized JavaScript origins:**
   - Leave empty (not needed for server-side OAuth flow)

5. **Authorized redirect URIs:** ⭐ **CRITICAL - MUST BE EXACT**
   - Click **Add URI**
   - Enter: `https://donations.projectsforasia.com/auth/google_oauth2/callback`
   - **Important:**
     - Must be HTTPS (not HTTP) in production
     - No trailing slash
     - Path must be exactly `/auth/google_oauth2/callback`

6. Click **Create**

### Save Your Credentials

A dialog will appear with your credentials:

- **Client ID:** (e.g., `123456789-abc123xyz.apps.googleusercontent.com`)
- **Client Secret:** (e.g., `GOCSPX-abc123xyz...`)

⚠️ **IMPORTANT:** Copy both values immediately! The client secret is only shown once.

**Recommended:** Save to a secure password manager or immediately add to your production `.env` file.

---

## Step 4: Configure Production Environment

### SSH into Production Server

```bash
ssh deploy@YOUR_SERVER_IP
cd /var/www/donation-tracker
```

### Update Environment Variables

```bash
nano .env
```

Add or update these lines:

```bash
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_CLIENT_SECRET_HERE
```

**Replace:**
- `YOUR_CLIENT_ID_HERE` with your actual Client ID
- `YOUR_CLIENT_SECRET_HERE` with your actual Client Secret

### Secure the File

```bash
chmod 600 .env
```

### Restart Application

```bash
docker compose -f docker-compose.prod.yml restart api
```

---

## Step 5: Test Authentication

### Test Login Flow

1. Open browser: https://donations.projectsforasia.com/login

2. Click **"Sign in with Google"**

3. **Expected behavior:**
   - Google sign-in page appears
   - Shows list of Google accounts
   - Only @projectsforasia.com accounts should work
   - Non-@projectsforasia.com accounts will be rejected

4. Select a @projectsforasia.com account

5. **Expected result:**
   - Redirect to consent screen (first time only)
   - Shows app name "Donation Tracker"
   - Lists requested permissions (email, profile)
   - Click "Allow"

6. **Final result:**
   - Redirect back to https://donations.projectsforasia.com
   - User logged in successfully
   - Can access protected pages

---

## Key Differences from Previous Setup

### What's New in 2025

✅ **"Internal" user type** - Automatically restricts to Google Workspace domain (no manual configuration needed)

✅ **New navigation** - "Google Auth platform" menu in addition to classic "APIs & Services"

✅ **No verification required** - Internal apps skip Google's verification process

✅ **Simplified scopes** - Basic scopes (email, profile) don't need explicit listing for internal apps

✅ **Streamlined flow** - Fewer configuration steps than external apps

### What Stays the Same

- Client ID and Client Secret still required
- Redirect URI still critical and must be exact
- Backend implementation (Rails + OmniAuth) unchanged
- OAuth2 flow and token handling unchanged

---

## Troubleshooting

### Error: "Redirect URI mismatch"

**Symptom:** After clicking "Sign in with Google", see error about redirect URI

**Causes:**
- Redirect URI in Google Cloud Console doesn't match actual callback URL
- Trailing slash mismatch
- HTTP vs HTTPS mismatch
- Typo in URI

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Verify "Authorized redirect URIs" contains EXACTLY:
   ```
   https://donations.projectsforasia.com/auth/google_oauth2/callback
   ```
4. Save changes
5. Test again (may take a few minutes to propagate)

### Error: "Access denied" for @projectsforasia.com users

**Symptom:** Users with @projectsforasia.com email cannot sign in

**Causes:**
- User type set to "External" instead of "Internal"
- Google Workspace domain verification issue

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Verify "User type" is set to **Internal**
3. If set to "External", you'll need to recreate the consent screen as "Internal"

### Error: "This app isn't verified"

**Symptom:** Warning screen about unverified app appears

**Causes:**
- User type set to "External" instead of "Internal"

**Solution:**
- Internal apps should NEVER show this warning
- Verify consent screen is set to "Internal" user type
- If "External", recreate as "Internal"

### Error: "Invalid client" or "Unauthorized"

**Symptom:** OAuth flow fails with client error

**Causes:**
- Client ID or Client Secret incorrect in `.env`
- Environment variables not loaded
- Application not restarted after changing `.env`

**Solution:**
1. Verify credentials in `.env` match Google Cloud Console exactly
2. Check for extra spaces or quotes in `.env`
3. Restart application: `docker compose -f docker-compose.prod.yml restart api`
4. Check logs: `docker compose -f docker-compose.prod.yml logs api`

### Users Can't Access After Login

**Symptom:** Login succeeds but app shows "Access denied"

**Causes:**
- Backend domain restriction enforcement

**Causes & Solution:**
- Check `app/controllers/auth_controller.rb` line ~15
- Verify domain check: `auth.info.email.end_with?("@projectsforasia.com")`
- This is expected behavior for non-@projectsforasia.com emails
- For @projectsforasia.com emails, check backend logs for other errors

---

## Security Best Practices

### Protect Your Credentials

- ✅ **Never commit** `.env` to git (already in `.gitignore`)
- ✅ **Use strong file permissions:** `chmod 600 .env`
- ✅ **Rotate secrets** if accidentally exposed
- ✅ **Use separate credentials** for development and production

### Monitor Access

- Review Google Cloud Console audit logs periodically
- Monitor failed login attempts in application logs
- Set up alerts for unusual authentication patterns

### Credential Rotation

If you need to rotate credentials:

1. Create new OAuth client ID in Google Cloud Console
2. Update `.env` with new credentials
3. Restart application
4. Test authentication
5. Delete old OAuth client ID from Google Cloud Console

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Workspace OAuth Guide](https://developers.google.com/workspace/guides/configure-oauth-consent)
- [OmniAuth Google OAuth2 Strategy](https://github.com/zquestz/omniauth-google-oauth2)
- [Rails Credentials Best Practices](https://guides.rubyonrails.org/security.html#environmental-security)

---

## Related Documentation

- **TICKET-136:** Production Google OAuth setup ticket
- **TICKET-008:** Initial OAuth authentication implementation
- **deployment/DEPLOYMENT-DOCKER.md:** Full production deployment guide
- **.env.production.example:** Environment variable template

---

**Last Updated:** 2025-02-12
**Researched:** Based on current Google Cloud Console documentation (February 2025)
**Ticket:** TICKET-136
