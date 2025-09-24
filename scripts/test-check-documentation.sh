#!/bin/bash
# Tests for check-documentation.sh script

# Source the test framework
source "$(dirname "$0")/test-runner.sh"

echo "Testing check-documentation.sh script"
echo "======================================"

# Test 1: Script should exist and be executable
test_script_exists() {
    local script_path="$(dirname "$0")/check-documentation.sh"

    if [[ -f "$script_path" && -x "$script_path" ]]; then
        assert_equals "true" "true" "Script exists and is executable"
    else
        assert_equals "true" "false" "Script exists and is executable"
    fi
}

# Test 2: Script should output a warning message
test_outputs_warning() {
    local script_path="$(dirname "$0")/check-documentation.sh"
    local output=$(bash "$script_path" 2>&1)

    assert_contains "Documentation" "$output" "Script outputs documentation warning"
}

# Run tests one at a time (following single test TDD rule)
# Note: Not using setup since we're testing the actual script file
test_script_exists
test_outputs_warning

# Show results (no teardown needed since we didn't use setup)
print_results