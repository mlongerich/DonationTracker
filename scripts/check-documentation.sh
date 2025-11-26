#!/bin/bash
# Intelligent documentation validation for pre-commit hook

# Allow bypassing with environment variable
if [ "$SKIP_DOC_CHECK" = "1" ]; then
  echo "⏭️  Documentation check skipped (SKIP_DOC_CHECK=1)"
  exit 0
fi

# Allow bypassing with commit message tag
COMMIT_MSG=$(git log --format=%B -n 1 2>/dev/null || cat .git/COMMIT_EDITMSG 2>/dev/null || echo "")
if echo "$COMMIT_MSG" | grep -q "\[skip-docs\]"; then
  echo "⏭️  Documentation check skipped ([skip-docs] tag in commit message)"
  exit 0
fi

echo "🔍 Checking documentation updates..."

# Detect ticket number from changes (modified + untracked files)
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null)
UNTRACKED_FILES=$(git ls-files --others --exclude-standard 2>/dev/null)
ALL_FILES="${CHANGED_FILES}
${UNTRACKED_FILES}"

TICKET=$(echo "$ALL_FILES" | grep -o 'TICKET-[0-9]\+' | head -1)

# No ticket detected
if [ -z "$TICKET" ]; then
  echo "✅ No ticket detected, skipping documentation check"
  exit 0
fi

echo "📋 Detected ticket: $TICKET"

# Required documentation files
REQUIRED_FILES=(
  "CLAUDE.md"
  "docs/DonationTracking.md"
  "tickets/README.md"
)

# Find ticket file location (check both active and completed)
TICKET_FILE=""
if [ -f "tickets/${TICKET}.md" ]; then
  TICKET_FILE="tickets/${TICKET}.md"
elif [ -f "tickets/completed/${TICKET}.md" ]; then
  TICKET_FILE="tickets/completed/${TICKET}.md"
else
  # Ticket file might not exist yet, find by pattern
  TICKET_FILE=$(find tickets/ -name "${TICKET}-*.md" 2>/dev/null | head -1)
fi

if [ -n "$TICKET_FILE" ]; then
  REQUIRED_FILES+=("$TICKET_FILE")
fi

# Check each file for uncommitted changes
MISSING_CHANGES=()
for file in "${REQUIRED_FILES[@]}"; do
  # Check if file appears in git status
  # Git shows: "?? filename" for untracked files, "?? dir/" for untracked directories
  file_dir=$(dirname "$file")

  # Match the file itself OR its parent directory (if not root)
  if [ "$file_dir" = "." ]; then
    # File in root directory - just match the filename
    pattern=" $file\$"
  else
    # File in subdirectory - match file or directory
    pattern=" ($file|$file_dir/)\$"
  fi

  if ! git status --porcelain 2>/dev/null | grep -q -E "$pattern"; then
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
  echo "💡 Hint: Claude Code can help! Just ask it to review and update docs."
  exit 1
fi
