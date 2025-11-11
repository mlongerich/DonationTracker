## [TICKET-041] Add Test Coverage for API Client Methods

**Status:** ❌ Canceled
**Priority:** 🟡 Medium
**Effort:** M (Medium)
**Created:** 2025-10-18
**Canceled:** 2025-11-07
**Dependencies:** None

### Cancellation Reason

This ticket has been **canceled** for the following reasons:

1. **E2E tests provide sufficient coverage** - Cypress tests already validate full API integration
2. **Existing Jest mock tests are adequate** - 5 critical API methods already have unit tests (mergeDonors, fetchChildren, fetchSponsorshipsForDonation, createSponsorship, fetchProjectsBySearch)
3. **Maintenance burden not justified** - MSW setup requires ongoing maintenance to keep mocks in sync with backend
4. **Single-developer monorepo** - No need for contract testing layer when frontend/backend deployed together
5. **Better ROI on feature development** - 2.5-3 hours better spent on user-facing features (e.g., TICKET-052)

**Alternative Approach:** Keep existing Jest mock tests, add minimal tests for remaining methods if needed.

### User Story
As a developer, I want comprehensive test coverage for API client methods so that I can confidently refactor and maintain the HTTP layer without breaking functionality.

### Problem Statement
Currently, `src/api/client.ts` has no test coverage:
- `mergeDonors()` - No tests
- `createDonation()` - No tests
- Future project methods will also lack tests

**Code Smell:** Untested HTTP client layer
**Risk:** API contract changes could break silently

### Acceptance Criteria
- [ ] Set up MSW (Mock Service Worker) for HTTP mocking in tests
- [ ] Write tests for `mergeDonors()` method
- [ ] Write tests for `createDonation()` method
- [ ] Write tests for project API methods (fetchProjects, createProject, updateProject, deleteProject)
- [ ] Test success cases
- [ ] Test error cases (401, 404, 500, network errors)
- [ ] Test request interceptors (auth token injection)
- [ ] Test response interceptors (global error handling)
- [ ] All tests pass
- [ ] Update CLAUDE.md with API client testing patterns

### Technical Approach

#### 1. Install MSW
```bash
npm install --save-dev msw@latest
```

#### 2. Set up MSW handlers
```typescript
// src/api/__mocks__/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('http://localhost:3001/api/donors/merge', () => {
    return HttpResponse.json({ donor: { id: 1, name: 'Merged Donor' } });
  }),

  http.post('http://localhost:3001/api/donations', () => {
    return HttpResponse.json({ donation: { id: 1, amount: 100 } });
  }),

  http.get('http://localhost:3001/api/projects', () => {
    return HttpResponse.json({
      projects: [{ id: 1, title: 'Test Project' }],
      meta: { total_count: 1 }
    });
  }),
];
```

#### 3. Configure MSW in tests
```typescript
// src/setupTests.ts
import { setupServer } from 'msw/node';
import { handlers } from './api/__mocks__/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### 4. Write API client tests (TDD)
```typescript
// src/api/client.test.ts
import { mergeDonors, createDonation, fetchProjects } from './client';
import { server } from '../setupTests';
import { http, HttpResponse } from 'msw';

describe('API Client', () => {
  describe('mergeDonors', () => {
    it('sends correct request payload', async () => {
      const result = await mergeDonors([1, 2], { name: 1, email: 2 });

      expect(result.donor).toBeDefined();
      expect(result.donor.id).toBe(1);
    });

    it('handles 401 errors', async () => {
      server.use(
        http.post('http://localhost:3001/api/donors/merge', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      await expect(mergeDonors([1, 2], { name: 1, email: 2 }))
        .rejects.toThrow();
    });
  });

  describe('createDonation', () => {
    it('creates donation with all fields', async () => {
      const donation = {
        amount: 100.50,
        date: '2025-10-18',
        donor_id: 1,
        project_id: 2,
        status: 'completed'
      };

      const result = await createDonation(donation);

      expect(result.donation).toBeDefined();
    });
  });

  describe('fetchProjects', () => {
    it('fetches projects with pagination', async () => {
      const result = await fetchProjects({ page: 1, per_page: 25 });

      expect(result.projects).toHaveLength(1);
      expect(result.meta.total_count).toBe(1);
    });
  });
});
```

### Testing Strategy

**Success Cases:**
- Valid requests return expected data
- Request payloads are correctly formatted
- Pagination parameters are passed correctly

**Error Cases:**
- 401 Unauthorized - clears token, redirects
- 404 Not Found - rejects with error
- 500 Server Error - rejects with error
- Network errors - rejects with error

**Interceptor Tests:**
- Auth token added to Authorization header
- Global error handler catches 401
- Errors logged to console

### Benefits
- **Confidence**: Safe refactoring of API client
- **Documentation**: Tests serve as usage examples
- **Regression Prevention**: API contract changes caught early
- **Fast Feedback**: No need to run full E2E tests for API issues

### Files to Create
- `src/api/__mocks__/handlers.ts` (NEW)
- `src/api/client.test.ts` (NEW)

### Files to Modify
- `src/setupTests.ts` (UPDATE - add MSW server setup)
- `package.json` (UPDATE - add msw dependency)
- `CLAUDE.md` (UPDATE - add API client testing patterns)

### Related Tickets
- TICKET-009: Project-based donations (needs project API methods)
- Part of test coverage improvement initiative

### Notes
- MSW v2.0+ uses new API (`http.get`, `HttpResponse`)
- Mock handlers should match real API contract
- Test both happy path and error scenarios
- Keep mocks simple - complex logic belongs in backend tests
