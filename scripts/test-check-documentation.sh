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

# Test 2: Script exits 0 when no ticket detected (no git changes)
test_no_ticket_detected() {
    # Get absolute path to script before changing directories
    local script_path="$(cd "$(dirname "$0")" && pwd)/check-documentation.sh"

    # Create temporary git repo with no ticket-related changes
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    git init -q
    echo "test" > README.md
    git add README.md
    git commit -m "Initial commit" -q

    # Run script (should exit 0, no ticket detected)
    local output=$(bash "$script_path" 2>&1)
    local exit_code=$?

    # Cleanup
    cd - > /dev/null
    rm -rf "$temp_dir"

    assert_equals "0" "$exit_code" "Script exits 0 when no ticket detected"
    assert_contains "No ticket detected" "$output" "Script outputs 'No ticket detected' message"
}

# Test 3: Script detects ticket number from changed files
test_ticket_detected_from_changes() {
    # Get absolute path to script before changing directories
    local script_path="$(cd "$(dirname "$0")" && pwd)/check-documentation.sh"

    # Create temporary git repo with ticket-related changes
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    git init -q

    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit -m "Initial commit" -q

    # Create ticket file change (uncommitted)
    mkdir -p tickets
    echo "# TICKET-123 Test" > tickets/TICKET-123-test-ticket.md

    # Run script (should detect TICKET-123)
    local output=$(bash "$script_path" 2>&1)
    local exit_code=$?

    # Cleanup
    cd - > /dev/null
    rm -rf "$temp_dir"

    # For now, we just check that ticket was detected (exit code may vary)
    assert_contains "TICKET-123" "$output" "Script detects ticket number from changed files"
}

# Test 4: Script finds ticket file in tickets/ directory
test_finds_ticket_file_in_active_directory() {
    # Get absolute path to script before changing directories
    local script_path="$(cd "$(dirname "$0")" && pwd)/check-documentation.sh"

    # Create temporary git repo
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    git init -q

    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit -m "Initial commit" -q

    # Create ticket file in active directory
    mkdir -p tickets
    echo "# TICKET-456 Active Ticket" > tickets/TICKET-456-active-ticket.md

    # Run script (should find ticket file)
    local output=$(bash "$script_path" 2>&1)
    local exit_code=$?

    # Cleanup
    cd - > /dev/null
    rm -rf "$temp_dir"

    # Script should mention the ticket file in some way
    assert_contains "TICKET-456" "$output" "Script processes ticket file from active directory"
}

# Test 5: Script finds ticket file in tickets/completed/ directory
test_finds_ticket_file_in_completed_directory() {
    # Get absolute path to script before changing directories
    local script_path="$(cd "$(dirname "$0")" && pwd)/check-documentation.sh"

    # Create temporary git repo
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    git init -q

    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit -m "Initial commit" -q

    # Create ticket file in completed directory
    mkdir -p tickets/completed
    echo "# TICKET-789 Completed Ticket" > tickets/completed/TICKET-789-completed-ticket.md

    # Run script (should find ticket file in completed/)
    local output=$(bash "$script_path" 2>&1)
    local exit_code=$?

    # Cleanup
    cd - > /dev/null
    rm -rf "$temp_dir"

    # Script should detect TICKET-789
    assert_contains "TICKET-789" "$output" "Script processes ticket file from completed directory"
}

# Test 6: Script exits 1 when required docs are missing
test_exits_1_when_docs_missing() {
    # Disable exit-on-error for this test (we expect the script to fail)
    set +e

    # Get absolute path to script before changing directories
    local script_path="$(cd "$(dirname "$0")" && pwd)/check-documentation.sh"

    # Create temporary git repo
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    git init -q

    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit -m "Initial commit" -q

    # Create ticket file but NO documentation updates
    mkdir -p tickets
    echo "# TICKET-999 Test" > tickets/TICKET-999-test.md

    # Run script (should fail - docs missing)
    bash "$script_path" > /tmp/test-output.txt 2>&1
    local exit_code=$?
    local output=$(cat /tmp/test-output.txt)
    rm -f /tmp/test-output.txt

    # Cleanup
    cd - > /dev/null
    rm -rf "$temp_dir"

    # Re-enable exit-on-error
    set -e

    # Script should exit 1 (failure)
    assert_equals "1" "$exit_code" "Script exits 1 when docs missing"

    # Script should list missing files
    assert_contains "CLAUDE.md" "$output" "Script lists CLAUDE.md as missing"
    assert_contains "DonationTracking.md" "$output" "Script lists DonationTracking.md as missing"
}

# Test 7: Script exits 0 when all required docs are updated
test_exits_0_when_docs_updated() {
    # Get absolute path to script before changing directories
    local script_path="$(cd "$(dirname "$0")" && pwd)/check-documentation.sh"

    # Create temporary git repo
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    git init -q

    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit -m "Initial commit" -q

    # Create ALL required documentation updates (untracked)
    mkdir -p tickets docs
    echo "# TICKET-888 Test" > tickets/TICKET-888-test.md
    echo "# CLAUDE updates" > CLAUDE.md
    echo "# Tracking updates" > docs/DonationTracking.md
    echo "# README updates" > tickets/README.md

    # Run script (should pass - all docs updated)
    local output=$(bash "$script_path" 2>&1)
    local exit_code=$?

    # Cleanup
    cd - > /dev/null
    rm -rf "$temp_dir"

    # Script should exit 0 (success)
    assert_equals "0" "$exit_code" "Script exits 0 when all docs updated"
    assert_contains "All required documentation files have changes" "$output" "Script confirms all docs updated"
}

# Test 8: Environment variable bypass (SKIP_DOC_CHECK=1)
test_env_var_bypass() {
    # Get absolute path to script before changing directories
    local script_path="$(cd "$(dirname "$0")" && pwd)/check-documentation.sh"

    # Create temporary git repo with ticket changes but NO docs
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    git init -q

    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit -m "Initial commit" -q

    # Create ticket file but NO documentation (would normally fail)
    mkdir -p tickets
    echo "# TICKET-777 Test" > tickets/TICKET-777-test.md

    # Run script with SKIP_DOC_CHECK=1 (should pass despite missing docs)
    SKIP_DOC_CHECK=1 bash "$script_path" > /tmp/test-output.txt 2>&1
    local exit_code=$?
    local output=$(cat /tmp/test-output.txt)
    rm -f /tmp/test-output.txt

    # Cleanup
    cd - > /dev/null
    rm -rf "$temp_dir"

    # Script should exit 0 (success) and show skip message
    assert_equals "0" "$exit_code" "Script exits 0 when SKIP_DOC_CHECK=1"
    assert_contains "skipped" "$output" "Script outputs skip message"
    assert_contains "SKIP_DOC_CHECK" "$output" "Script mentions SKIP_DOC_CHECK"
}

# Test 9: Commit message tag bypass ([skip-docs])
test_commit_message_bypass() {
    # Get absolute path to script before changing directories
    local script_path="$(cd "$(dirname "$0")" && pwd)/check-documentation.sh"

    # Create temporary git repo with ticket changes but NO docs
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    git init -q

    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit -m "Initial commit" -q

    # Create ticket file but NO documentation (would normally fail)
    mkdir -p tickets
    echo "# TICKET-666 Test" > tickets/TICKET-666-test.md
    git add tickets/TICKET-666-test.md
    git commit -m "hotfix: urgent fix [skip-docs]" -q

    # Run script (should pass due to [skip-docs] tag in last commit)
    bash "$script_path" > /tmp/test-output.txt 2>&1
    local exit_code=$?
    local output=$(cat /tmp/test-output.txt)
    rm -f /tmp/test-output.txt

    # Cleanup
    cd - > /dev/null
    rm -rf "$temp_dir"

    # Script should exit 0 (success) and show skip message
    assert_equals "0" "$exit_code" "Script exits 0 when [skip-docs] in commit message"
    assert_contains "skipped" "$output" "Script outputs skip message"
    assert_contains "skip-docs" "$output" "Script mentions [skip-docs] tag"
}

# Run tests one at a time (following single test TDD rule)
test_script_exists
test_no_ticket_detected
test_ticket_detected_from_changes
test_finds_ticket_file_in_active_directory
test_finds_ticket_file_in_completed_directory
test_exits_1_when_docs_missing
test_exits_0_when_docs_updated
test_env_var_bypass
test_commit_message_bypass

# Show results
print_results
