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
