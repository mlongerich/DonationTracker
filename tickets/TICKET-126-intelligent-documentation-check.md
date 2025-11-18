## [TICKET-126] Intelligent Pre-Commit Documentation Validation

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small - 1-2 hours)
**Created:** 2025-11-18
**Dependencies:** None

### User Story
As a developer, I want the pre-commit hook to intelligently validate documentation updates so that I don't forget to update CLAUDE.md, DonationTracking.md, or ticket files when making changes.

### Problem Statement
**Current State:**
- `check-documentation.sh` outputs passive reminder message
- No actual validation of documentation updates
- Relies on developer memory to update docs
- Easy to commit code without updating documentation

**Desired State:**
- Script actively checks if documentation files have uncommitted changes
- Detects which TICKET is being worked on
- Outputs specific files that need review
- Claude Code can see output and intelligently update docs

### Acceptance Criteria
- [ ] Script detects ticket number from git changes (staged/unstaged files)
- [ ] Script checks if CLAUDE.md has uncommitted changes
- [ ] Script checks if docs/DonationTracking.md has uncommitted changes
- [ ] Script checks if tickets/README.md has uncommitted changes
- [ ] Script checks if tickets/TICKET-XXX.md (or completed/TICKET-XXX.md) has uncommitted changes
- [ ] Script outputs structured message listing missing documentation files
- [ ] Script exits with code 1 if documentation missing (blocks commit)
- [ ] Script exits with code 0 if all docs updated (allows commit)
- [ ] Clear guidance on what needs updating

### Technical Approach

#### Phase 1: Git-Based Detection (MVP)

**Script Logic:**
```bash
#!/bin/bash
set -e

echo "🔍 Checking documentation updates..."

# Detect ticket number from changes
TICKET=$(git diff --name-only HEAD | grep -oP 'TICKET-\d+' | head -1)

if [ -z "$TICKET" ]; then
  echo "✅ No ticket detected in changes, skipping documentation check"
  exit 0
fi

echo "📋 Detected ticket: $TICKET"

# Required documentation files
REQUIRED_FILES=(
  "CLAUDE.md"
  "docs/DonationTracking.md"
  "tickets/README.md"
)

# Find ticket file location
TICKET_FILE=""
if [ -f "tickets/$TICKET.md" ]; then
  TICKET_FILE="tickets/$TICKET.md"
elif [ -f "tickets/completed/$TICKET.md" ]; then
  TICKET_FILE="tickets/completed/$TICKET.md"
fi

if [ -n "$TICKET_FILE" ]; then
  REQUIRED_FILES+=("$TICKET_FILE")
fi

# Check each file for uncommitted changes
MISSING_CHANGES=()
for file in "${REQUIRED_FILES[@]}"; do
  # Check if file has modifications (M) or deletions (D)
  if ! git status --porcelain | grep -qE "^[MD ]M|^D " | grep -q "$file"; then
    # File not in git status output = no changes
    MISSING_CHANGES+=("$file")
  fi
done

# Report findings
if [ ${#MISSING_CHANGES[@]} -eq 0 ]; then
  echo "✅ All required documentation files have changes"
  exit 0
else
  echo "❌ Missing documentation updates for $TICKET:"
  for file in "${MISSING_CHANGES[@]}"; do
    echo "   - $file"
  done
  echo ""
  echo "ACTION REQUIRED: Review these files and update if needed"
  echo "Hint: Claude Code can help! Just ask it to review and update docs."
  exit 1
fi
```

#### Phase 2: Agent Integration (Future Enhancement)

**Advanced Features:**
- Spawn Task agent to read ticket and changed files
- Agent intelligently decides if docs truly need updates
- Agent can make updates or report "no changes needed"
- Reduces false positives

**Implementation:**
```bash
# In native-pre-commit.sh
if ! bash scripts/check-documentation.sh; then
  echo ""
  echo "🤖 TIP: Use Claude Code to review documentation:"
  echo "   'Check if docs need updating for this ticket'"
  # Claude Code sees this and can spawn agent via Task tool
fi
```

### Benefits
- **Prevents Missing Docs**: Active validation vs passive reminder
- **Intelligent Detection**: Finds ticket number automatically
- **Clear Guidance**: Lists exactly which files need review
- **Claude Code Integration**: Structured output for automation
- **Fail-Fast**: Blocks commit if docs missing (unless --no-verify)

### Implementation Notes

**Git Status Patterns:**
```bash
# Modified file
git status --porcelain
# Output: "M CLAUDE.md"

# Untracked file
# Output: "?? new-file.md"

# Staged + unstaged changes
# Output: "MM CLAUDE.md"
```

**Ticket Detection:**
```bash
# From file changes
git diff --name-only HEAD | grep -oP 'TICKET-\d+'
# Example: tickets/TICKET-099-expand-custom-hooks-library.md → TICKET-099

# From commit message (alternative)
git log --format=%B -n 1 | grep -oP 'TICKET-\d+'
```

**Edge Cases:**
- Multiple tickets in one commit → use first detected
- No ticket detected → skip check (assume non-ticket work)
- Ticket file not found → warn but don't fail

### Files to Modify
- `scripts/check-documentation.sh` (REWRITE - upgrade from passive to active)

### Testing Strategy
```bash
# Test 1: No changes → should pass
git stash
bash scripts/check-documentation.sh
# Expected: ✅ No ticket detected

# Test 2: TICKET changes, docs missing → should fail
git stash pop
git add tickets/TICKET-099-*.md
bash scripts/check-documentation.sh
# Expected: ❌ Missing: CLAUDE.md, DonationTracking.md, README.md

# Test 3: All docs updated → should pass
git add CLAUDE.md docs/DonationTracking.md tickets/README.md
bash scripts/check-documentation.sh
# Expected: ✅ All documentation files have changes
```

### Related Tickets
- Part of continuous improvement for development workflow
- Supports CLAUDE.md mandatory update policy
- Complements native git hooks (TICKET-035 infrastructure)

### Future Enhancements (Phase 2)
- **Intelligent Review Agent**:
  - Read TICKET file to understand changes
  - Read changed code files
  - Decide if CLAUDE.md patterns section needs update
  - Decide if DonationTracking.md status needs update
  - Make updates autonomously or ask for confirmation

- **Skip Patterns**:
  - Allow `# SKIP_DOC_CHECK` in commit message
  - Configure exceptions in .git/config

- **Integration with Claude Code**:
  - Structured JSON output for machine parsing
  - Auto-spawn review agent on detection

### Notes
- This is a workflow improvement, not a critical feature
- Fail gracefully if git commands fail
- Don't block commits with `--no-verify` flag
- Keep Phase 1 simple and fast (<100ms execution)
