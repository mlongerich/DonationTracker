#!/bin/bash
# Test runner for pre-commit scripts using bash unit testing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
assert_equals() {
    local expected="$1"
    local actual="$2"
    local test_name="${3:-Test}"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [[ "$expected" == "$actual" ]]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo "  Expected: '$expected'"
        echo "  Actual: '$actual'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

assert_exit_code() {
    local expected_code="$1"
    local command="$2"
    local test_name="${3:-Exit code test}"

    TESTS_RUN=$((TESTS_RUN + 1))

    if eval "$command" >/dev/null 2>&1; then
        actual_code=0
    else
        actual_code=$?
    fi

    if [[ "$expected_code" == "$actual_code" ]]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo "  Expected exit code: $expected_code"
        echo "  Actual exit code: $actual_code"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

assert_contains() {
    local expected_substring="$1"
    local actual_text="$2"
    local test_name="${3:-Contains test}"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [[ "$actual_text" == *"$expected_substring"* ]]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo "  Expected substring: '$expected_substring'"
        echo "  Actual text: '$actual_text'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Setup function
setup() {
    # Create temporary test directory
    export TEST_DIR=$(mktemp -d)
    export OLD_PWD="$PWD"
    cd "$TEST_DIR"

    # Mock git commands for testing
    mkdir -p .git

    # Create mock files for testing
    mkdir -p donation_tracker_api donation_tracker_frontend
    touch CLAUDE.md DonationTracking.md
    touch donation_tracker_api/app/models/user.rb
    touch donation_tracker_frontend/src/App.tsx
}

# Teardown function
teardown() {
    cd "$OLD_PWD"
    rm -rf "$TEST_DIR"
}

# Print test results
print_results() {
    echo
    echo "Test Results:"
    echo -e "  Total: $TESTS_RUN"
    echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
        exit 1
    else
        echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
        echo
        echo -e "${GREEN}All tests passed! ✓${NC}"
    fi
}

# Export functions for use in test files
export -f assert_equals assert_exit_code assert_contains setup teardown