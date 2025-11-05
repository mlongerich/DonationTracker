## [TICKET-090] Fix Cypress in Docker (Alpine ARM64 Binary Issue)

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** M (Medium - 3-4 hours including testing)
**Created:** 2025-11-05
**Source:** BACKLOG.md
**Dependencies:** None (infrastructure)

### User Story
As a developer, I want Cypress E2E tests to run inside Docker containers so that pre-commit hooks can validate tests and CI/CD pipelines can run the full test suite in a consistent environment.

### Problem Statement
**Current Issue:**
- Cypress binary fails to run in Docker frontend container
- Error: `ENOENT: spawn /root/.cache/Cypress/13.17.0/Cypress/Cypress`
- Root cause: Alpine Linux ARM64 architecture incompatibility with Cypress binary
- Workaround: Run Cypress tests locally outside Docker (inconsistent env)

**Impact:**
- Pre-commit hooks cannot run Cypress tests automatically
- CI/CD pipeline cannot run E2E tests
- Development environment inconsistency across team

### Error Details
```
Command failed with ENOENT: /root/.cache/Cypress/13.17.0/Cypress/Cypress --no-sandbox --smoke-test --ping=642
spawn /root/.cache/Cypress/13.17.0/Cypress/Cypress ENOENT
Platform: linux-arm64 (Alpine Linux - 3.22.1)
```

### Solution Options

#### Option 1: Switch to Debian Base Image (RECOMMENDED)
**Approach:** Replace Alpine with Debian-based Node image

**Pros:**
- Cypress officially supported on Debian
- Larger ecosystem of compatible binaries
- Battle-tested for E2E testing

**Cons:**
- Larger image size (~300MB vs ~50MB Alpine)
- Longer build times
- More security surface area

**Implementation:**
```dockerfile
# donation_tracker_frontend/Dockerfile
FROM node:20-bullseye  # Changed from node:20-alpine

# Install Cypress dependencies
RUN apt-get update && apt-get install -y \
  libgtk2.0-0 \
  libgtk-3-0 \
  libgbm-dev \
  libnotify-dev \
  libnss3 \
  libxss1 \
  libasound2 \
  libxtst6 \
  xauth \
  xvfb

# Rest of Dockerfile...
```

#### Option 2: Use Official Cypress Docker Image
**Approach:** Base frontend container on `cypress/base:latest`

**Pros:**
- Pre-configured with all Cypress dependencies
- Maintained by Cypress team
- Optimized for E2E testing

**Cons:**
- Opinionated image structure
- May require Dockerfile restructuring
- Larger image size

**Implementation:**
```dockerfile
# donation_tracker_frontend/Dockerfile
FROM cypress/base:20.11.1

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npm", "run", "dev"]
```

#### Option 3: Separate Cypress Service
**Approach:** Run Cypress in dedicated Docker service with X11 forwarding

**Pros:**
- Keeps frontend container lean (Alpine)
- Isolated E2E environment
- Can use official Cypress image

**Cons:**
- Complex docker-compose configuration
- X11 forwarding required for headed mode
- Network connectivity complexity

**Implementation:**
```yaml
# docker-compose.yml
services:
  cypress:
    image: cypress/included:13.6.4
    depends_on:
      - frontend
      - api
    environment:
      - CYPRESS_baseUrl=http://frontend:3000
    volumes:
      - ./donation_tracker_frontend:/app
    working_dir: /app
```

#### Option 4: CI-Only E2E Tests
**Approach:** Run E2E tests in GitHub Actions / CI environment only

**Pros:**
- No Docker changes needed
- Simpler local development
- CI environment optimized for E2E

**Cons:**
- No local E2E test execution in Docker
- Pre-commit hooks still can't run E2E tests
- Development/CI parity reduced

### Recommended Solution: Option 1 (Debian Base Image)

**Rationale:**
- Simplest migration path (change one line in Dockerfile)
- Official Cypress support
- Maintains current docker-compose structure
- Pre-commit hooks work seamlessly

### Acceptance Criteria
- [ ] Cypress runs successfully inside Docker frontend container
- [ ] `docker-compose exec frontend npm run cypress:run` executes without errors
- [ ] Pre-commit hooks can run Cypress tests
- [ ] All existing E2E tests pass in Docker
- [ ] Image size increase acceptable (<500MB total)
- [ ] Build time increase acceptable (<5 minutes)
- [ ] Documentation updated (README, CLAUDE.md)

### Implementation Steps (Option 1)

1. **Update Dockerfile:**
   ```dockerfile
   # Before
   FROM node:20-alpine

   # After
   FROM node:20-bullseye

   # Add Cypress dependencies
   RUN apt-get update && apt-get install -y \
     libgtk2.0-0 \
     libgtk-3-0 \
     libgbm-dev \
     libnotify-dev \
     libnss3 \
     libxss1 \
     libasound2 \
     libxtst6 \
     xauth \
     xvfb \
     && rm -rf /var/lib/apt/lists/*
   ```

2. **Rebuild Container:**
   ```bash
   docker-compose build frontend
   docker-compose down
   docker-compose up -d
   ```

3. **Test Cypress:**
   ```bash
   docker-compose exec frontend npm run cypress:run
   ```

4. **Update Pre-Commit Hook:**
   ```bash
   # scripts/pre-commit-frontend.sh
   # Change from:
   npm run cypress:run

   # To:
   docker-compose exec -T frontend npm run cypress:run
   ```

5. **Test Pre-Commit Hook:**
   ```bash
   bash scripts/install-native-hooks.sh
   git add .
   git commit -m "test: verify Cypress runs in Docker"
   ```

### Files to Modify
- `donation_tracker_frontend/Dockerfile` (update base image + add dependencies)
- `scripts/pre-commit-frontend.sh` (update Cypress command)
- `docs/DOCKER.md` (document Cypress setup)
- `CLAUDE.md` (remove Cypress caveat from testing section)
- `BACKLOG.md` (remove this item after implementation)

### Testing Strategy
1. Run `docker-compose build frontend` → verify build succeeds
2. Run `docker-compose exec frontend npm run cypress:run` → verify all tests pass
3. Run `docker-compose exec frontend npm run cypress:open` → verify GUI works (optional, requires X11)
4. Test pre-commit hook → verify Cypress runs automatically
5. Measure image size → verify acceptable increase

### Performance Benchmarks
**Before (Alpine):**
- Image size: ~150MB
- Build time: ~2 minutes
- Cypress: Not working

**After (Debian - Expected):**
- Image size: ~400MB
- Build time: ~3-4 minutes
- Cypress: Working

### Estimated Time
- Dockerfile changes: 30 minutes
- Testing & debugging: 1-2 hours
- Pre-commit hook update: 30 minutes
- Documentation: 30 minutes
- **Total:** 3-4 hours

### Success Criteria
- [ ] `docker-compose exec frontend npm run cypress:run` executes successfully
- [ ] All 34+ E2E tests pass in Docker
- [ ] Pre-commit hook runs Cypress tests automatically
- [ ] CI/CD pipeline can run E2E tests (future)
- [ ] No regression in existing functionality
- [ ] Image size < 500MB

### Rollback Plan
If Debian image causes issues:
1. Revert Dockerfile to Alpine base
2. Use Option 4 (CI-only E2E tests)
3. Document local Cypress execution outside Docker

### Related Tickets
- TICKET-079-084: E2E test tickets (will benefit from this fix)
- TICKET-078: Fix Donation Filter Race Condition ✅ (fixed flaky Cypress tests)

### Notes
- **Priority:** Medium (nice-to-have for local dev, critical for CI/CD)
- **Trade-off:** Image size vs functionality (functionality wins)
- **Future:** Optimize Debian image size with multi-stage builds
- **Alternative:** Switch to Playwright (no Alpine ARM64 issues, but requires test rewrite)
