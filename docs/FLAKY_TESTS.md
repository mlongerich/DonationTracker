# Flaky Test Tracker

Track intermittent test failures to identify patterns and prioritize fixes.

## Log Format
- **Date:** YYYY-MM-DD
- **Test Suite:** Full path to test file
- **Test Name:** Exact test description
- **Failure Reason:** Error message summary
- **Context:** What was happening (e.g., running full suite, re-run passed)

---

## Logged Failures

### 2025-11-13

#### Jest Unit Test Suite - Timeout Failures Under Resource Contention
- **Context:** Failed during TICKET-077 pre-commit hook (full suite of 300 tests), all passed when run individually
- **Status:** ⚠️ Flaky - resource contention during full suite runs (not test logic issues)
- **Frequency:** Intermittent timeouts in full suite, 100% pass rate when isolated

**Failed Tests (all exceeded 5000ms timeout in full suite):**

1. **ChildAutocomplete.test.tsx**
   - **Test:** `shows "No results" when search returns empty`
   - **Full Suite:** Timeout (>5000ms)
   - **Isolated:** ✅ PASSED (2.9s total)

2. **DonorAutocomplete.test.tsx**
   - **Test:** `shows "No results" when search returns empty`
   - **Full Suite:** Timeout (>5000ms)
   - **Isolated:** ✅ PASSED (736ms, 3.4s total)

3. **ProjectForm.test.tsx**
   - **Test:** `calls onSubmit with form data when submitted`
   - **Full Suite:** Timeout (>5000ms)
   - **Isolated:** ✅ PASSED (602ms, 2.9s total)

4. **DonationList.test.tsx**
   - **Test:** `clears donor selection when clear filters is clicked`
   - **Full Suite:** Timeout (>5000ms)
   - **Isolated:** ✅ PASSED (1938ms, 6.7s total)

5. **ProjectsPage.test.tsx**
   - **Test:** `calls updateProject when editing project and form submitted`
   - **Full Suite:** Timeout (>5000ms)
   - **Isolated:** ✅ PASSED (489ms, 2.5s total)

6. **ChildrenPage.test.tsx**
   - **Test:** `updates an existing child`
   - **Full Suite:** Timeout (>5000ms)
   - **Isolated:** ✅ PASSED (390ms, 2.5s total)

**Root Cause:** Resource contention when running 300 tests in parallel. Tests complete within 400-1900ms when isolated, but exceed 5000ms timeout in full suite due to CPU/memory pressure.

**Recommendation:** Consider increasing Jest timeout for full suite runs or using `--maxWorkers=1` during pre-commit hooks to reduce parallelization.

### 2025-11-12

#### children-sponsorship.cy.ts (E2E) - Infrastructure Flakiness
- **Test:** All 10 tests in suite
- **Failure:** `beforeEach` hook failed with "socket hang up" on `DELETE /api/test/cleanup` request
- **Context:** Failed in full E2E suite run (15 specs), passed when run individually (10/10 passing in 24s)
- **Root Cause:** Docker/API infrastructure timing issues - E2E API server not ready or timing out during cleanup between specs
- **Status:** 🔴 Infrastructure flakiness - not test logic issue
- **Frequency:** Fails intermittently in full suite runs, consistently passes individually
- **Resolution:** Test logic is correct. Needs infrastructure fix (TICKET-108)

#### donation-filtering.cy.ts (E2E) - Infrastructure Flakiness
- **Test:** 1 of 7 tests (specific test unknown from full suite output)
- **Failure:** Test timeout or assertion failure during full suite run
- **Context:** Failed in full E2E suite run (15 specs), passed when run individually (7/7 passing in 42s)
- **Root Cause:** Docker/API infrastructure timing issues - likely database state or API response delays under load
- **Status:** 🔴 Infrastructure flakiness - not test logic issue
- **Frequency:** Fails intermittently in full suite runs, consistently passes individually
- **Resolution:** Test logic is correct. Needs infrastructure fix (TICKET-108)

**Note:** These failures are pre-existing infrastructure issues, not caused by TICKET-097 (useCallback refactoring). All tests pass when run individually with proper Docker setup.

### 2025-11-11

#### donation-filtering.cy.ts (E2E)
- **Test:** `filters donations by payment method`
- **Failure:** Test failed in first full suite run, passed on second run
- **Context:** New E2E test for TICKET-085 payment method filter. Failed during initial cypress:e2e run (56/58 passing), passed on retry (7/7 in file passing)
- **Root Cause:** Unknown - possible timing issue with payment method filter dropdown or API response
- **Status:** ⚠️ Flaky - intermittent failure in E2E suite
- **Frequency:** 1/2 runs failed
- **Resolution:** Passed on retry. Needs investigation for race conditions.

#### donation-stripe-badge.cy.ts (E2E)
- **Test:** `displays Stripe badge for donations created via Stripe import` OR `does not display Stripe badge for manual donations`
- **Failure:** One of the two tests failed in first full suite run, passed on second run
- **Context:** New E2E test file for TICKET-085 Stripe badge display. Failed during initial cypress:e2e run (56/58 passing), passed on retry (2/2 in file passing)
- **Root Cause:** Unknown - possible timing issue with badge rendering or API creation
- **Status:** ⚠️ Flaky - intermittent failure in E2E suite
- **Frequency:** 1/2 runs failed
- **Resolution:** Passed on retry. Needs investigation for race conditions.

### 2025-11-07

#### ProjectOrChildAutocomplete.test.tsx
- **Test:** `debounces search input (300ms)`
- **Failure:** Timeout or assertion failure (exact error not captured)
- **Context:** Failed during TICKET-052 implementation in full test suite run, passed on isolated re-run
- **Root Cause:** Debounce timing issue in full suite context (300ms delay)
- **Status:** ⚠️ Flaky - passes when run in isolation, fails intermittently in full suite
- **Frequency:** 1/2 runs failed
- **Resolution:** Test eventually passed after re-run. All 31 test suites passed.

### 2025-11-04

#### DonationList.test.tsx
- **Test:** `calls onDonorChange when donor is selected`
- **Failure:** `Unable to find an element with the text: John Doe (john@example.com)`
- **Context:** Failed during full test suite run (TICKET-067), passed on isolated re-run (21/21 tests passed)
- **Root Cause:** Timing/debounce issue with DonorAutocomplete component
- **Status:** ⚠️ Flaky - passes when run in isolation, fails intermittently in full suite
- **Frequency:** 1/2 runs failed

#### DonationForm.test.tsx
- **Test:** `passes child_id to backend when child selected`
- **Failure:** Timeout or timing issue (exact error not captured)
- **Context:** Failed during full test suite run (TICKET-069), passed on isolated re-run (1/15 tests passed when isolated)
- **Root Cause:** Likely timing issue with autocomplete/form interactions in full suite
- **Status:** ⚠️ Flaky - passes when run in isolation, fails intermittently in full suite
- **Frequency:** Failed in full suite run, passed in isolation (2025-11-04)

#### ProjectOrChildAutocomplete.test.tsx
- **Test:** `debounces search input (300ms)`
- **Failure:** Timeout or assertion failure (exact error not captured)
- **Context:** Failed during full test suite run (TICKET-069), passed on isolated re-run (4/4 tests passed when isolated)
- **Root Cause:** Debounce timing issue in full suite context
- **Status:** ⚠️ Flaky - passes when run in isolation, fails intermittently in full suite
- **Frequency:** Failed in full suite run, passed in isolation (2025-11-04)

---

## Analysis

### Patterns Identified
- **Timing-related failures:** Autocomplete components with debounced search
- **Isolation vs. Suite:** Tests pass when run in isolation, fail in full suite (resource contention?)

### Recommended Fixes
1. **Increase waitFor timeouts** in autocomplete tests from default 1000ms to 5000ms
2. **Add explicit async waits:** Use `waitFor(() => expect(...).toBeInTheDocument())` for async elements
3. **Prefer findBy queries:** Use `findBy` instead of `getBy` for async content (built-in waiting)
4. **Mock debounce timing:** Override debounce delays in tests to reduce wait times
5. **Investigate resource contention:** Run tests with `--maxWorkers=1` to see if parallelization causes issues

### Priority
- 🔴 High: If same test fails >50% of runs
- 🟡 Medium: If same test fails 10-50% of runs
- 🟢 Low: If random one-off failures

---

## Usage

When you encounter a flaky test:

1. **Log it immediately** with date, test name, error
2. **Note the context:** Full suite? Isolated? After which other tests?
3. **Re-run the test** 3 times to determine frequency
4. **Update frequency count** for existing entries

This helps identify:
- Which tests are consistently problematic
- Whether failures are random or systematic
- Patterns in test execution order that trigger failures
