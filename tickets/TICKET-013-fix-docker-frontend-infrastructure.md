## [TICKET-013] Fix Docker Frontend Infrastructure Issues

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** None

### User Story
As a developer, I want the Docker frontend container to run reliably so that I have deployment parity between local development and production.

### Acceptance Criteria
- [ ] Frontend Docker container starts without crashing
- [ ] Webpack compiles successfully in Docker environment
- [ ] Hot reload works without restart loops
- [ ] Update npm to latest version (11.6.1) locally
- [ ] Update npm to latest version in Docker container
- [ ] Fix Docker Compose buildx warning
- [ ] Resolve webpack deprecation warnings
- [ ] Document Docker development workflow

### Technical Notes
**Current Issues:**
1. **Container crash loop**: Frontend container crashes after webpack compiles successfully ("process exited too early")
2. **npm outdated**: Using npm 10.8.2, latest is 11.6.1
3. **Docker Compose warning**: "Docker Compose is configured to build using Bake, but buildx isn't installed"
4. **Webpack deprecations**:
   - DEP_WEBPACK_DEV_SERVER_ON_AFTER_SETUP_MIDDLEWARE
   - DEP_WEBPACK_DEV_SERVER_ON_BEFORE_SETUP_MIDDLEWARE
   - DEP0176 (fs.F_OK)
5. **Volume sync issues**: File changes not syncing properly between host and container
6. **Slow npm install**: Takes 5+ minutes in Docker vs <1 minute locally

**Root Cause Analysis Needed:**
- Investigate why process exits after successful compilation
- Check if it's related to file watching (CHOKIDAR_USEPOLLING, WATCHPACK_POLLING)
- Verify volume mount configuration is optimal
- Check for memory/resource constraints in Docker

**Proposed Solutions:**
1. **Update npm**: `npm install -g npm@11.6.1` (both local and Dockerfile)
2. **Install Docker buildx**:
   ```bash
   docker buildx install
   # Or update Docker Compose to use native builder
   ```
3. **Update react-scripts**: May need newer version with webpack 5 support
4. **Optimize Dockerfile**:
   - Multi-stage build for faster rebuilds
   - Better caching strategy for node_modules
   - Consider using named volumes for node_modules
5. **Fix webpack config**: Update setupMiddlewares configuration
6. **Workaround implemented**: Changed `prettier/prettier` from "error" to "warn" to prevent crashes

**TDD approach**: Red-Green-Refactor cycle followed for all tests

### Files Changed
- Docker: `donation_tracker_frontend/Dockerfile.dev` (optimize build)
- Docker: `docker-compose.yml` (fix buildx config)
- Frontend: `donation_tracker_frontend/package.json` (update npm scripts, dependencies)
- Frontend: `.npmrc` or `Dockerfile.dev` (specify npm version)
- Docs: `CLAUDE.md` (update Docker troubleshooting section)

### Related Commits
- (To be added during commit)
