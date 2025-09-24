#!/bin/bash
# Tests for pre-commit-frontend.sh script

# Source the test framework
source "$(dirname "$0")/test-runner.sh"

echo "Testing pre-commit-frontend.sh script"
echo "======================================"

# Test 1: Script should exist and be executable
test_script_exists() {
    local script_path="$(dirname "$0")/pre-commit-frontend.sh"

    if [[ -f "$script_path" && -x "$script_path" ]]; then
        assert_equals "true" "true" "Script exists and is executable"
    else
        assert_equals "true" "false" "Script exists and is executable"
    fi
}

# Test 2: Script should run ESLint
test_runs_eslint() {
    local script_path="$(dirname "$0")/pre-commit-frontend.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "ESLint" "$output" "Script runs ESLint"
}

# Test 3: Script should run Prettier
test_runs_prettier() {
    local script_path="$(dirname "$0")/pre-commit-frontend.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "Prettier" "$output" "Script runs Prettier"
}

# Test 4: Script should run TypeScript checks
test_runs_typescript() {
    local script_path="$(dirname "$0")/pre-commit-frontend.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "TypeScript" "$output" "Script runs TypeScript checks"
}

# Test 5: Script should run in the correct directory
test_runs_in_frontend_directory() {
    local script_path="$(dirname "$0")/pre-commit-frontend.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "donation_tracker_frontend" "$output" "Script runs in frontend directory"
}

# Run tests one at a time (following single test TDD rule)
test_script_exists
test_runs_eslint
test_runs_prettier
test_runs_typescript
test_runs_in_frontend_directory

# Show results
print_results