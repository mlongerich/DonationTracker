#!/bin/bash
# Tests for pre-commit-backend.sh script

# Source the test framework
source "$(dirname "$0")/test-runner.sh"

echo "Testing pre-commit-backend.sh script"
echo "====================================="

# Test 1: Script should exist and be executable
test_script_exists() {
    local script_path="$(dirname "$0")/pre-commit-backend.sh"

    if [[ -f "$script_path" && -x "$script_path" ]]; then
        assert_equals "true" "true" "Script exists and is executable"
    else
        assert_equals "true" "false" "Script exists and is executable"
    fi
}

# Test 2: Script should run RuboCop on backend files
test_runs_rubocop() {
    local script_path="$(dirname "$0")/pre-commit-backend.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "RuboCop" "$output" "Script runs RuboCop"
}

# Test 3: Script should run Brakeman security checks
test_runs_brakeman() {
    local script_path="$(dirname "$0")/pre-commit-backend.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "Brakeman" "$output" "Script runs Brakeman"
}

# Test 4: Script should exit with 0 on successful execution
test_exits_with_success_code() {
    local script_path="$(dirname "$0")/pre-commit-backend.sh"

    bash "$script_path" >/dev/null 2>&1
    local exit_code=$?

    assert_equals "0" "$exit_code" "Script exits with success code"
}

# Test 5: Script should run RSpec tests
test_runs_rspec() {
    local script_path="$(dirname "$0")/pre-commit-backend.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "RSpec" "$output" "Script runs RSpec tests"
}

# Test 6: Script should run in the correct directory
test_runs_in_backend_directory() {
    local script_path="$(dirname "$0")/pre-commit-backend.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "donation_tracker_api" "$output" "Script runs in backend directory"
}

# Run tests one at a time (following single test TDD rule)
test_script_exists
test_runs_rubocop
test_runs_brakeman
test_exits_with_success_code
test_runs_rspec
test_runs_in_backend_directory

# Show results
print_results