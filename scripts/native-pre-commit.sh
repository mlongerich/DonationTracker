#!/usr/bin/env bash
# Native Git Pre-commit Hook
# Replaces pre-commit framework to avoid stashing behavior that causes data loss
# This hook runs validation scripts directly without stashing unstaged changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory of the git repo
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo -e "${BLUE}Running pre-commit validations...${NC}"
echo ""

# ============================================================================
# SAFETY BACKUP: Create backup of working directory before running hooks
# ============================================================================
BACKUP_DIR=".git/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/pre-commit_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Create backup of all modified/untracked files
echo -e "${YELLOW}🛡️  Creating safety backup...${NC}"
git diff HEAD > "$BACKUP_PATH.patch" 2>/dev/null || true
git diff --cached HEAD > "$BACKUP_PATH.staged.patch" 2>/dev/null || true

# Also save list of untracked files
git ls-files --others --exclude-standard > "$BACKUP_PATH.untracked.txt" 2>/dev/null || true

echo -e "${GREEN}✓ Backup saved to: $BACKUP_PATH.patch${NC}"
echo ""

# Cleanup old backups (keep last 20)
find "$BACKUP_DIR" -name "pre-commit_*.patch" -type f | sort -r | tail -n +21 | xargs rm -f 2>/dev/null || true

# ============================================================================
# DOCUMENTATION CHECK (Blocking validation)
# ============================================================================
echo -e "${BLUE}📋 Documentation Check${NC}"
if bash scripts/check-documentation.sh; then
  echo -e "${GREEN}✓ Documentation validation passed${NC}"
else
  echo -e "${RED}✗ Documentation validation failed${NC}"
  echo ""
  echo -e "${YELLOW}💡 Bypass options:${NC}"
  echo -e "${YELLOW}   • SKIP_DOC_CHECK=1 git commit -m \"message\"${NC}"
  echo -e "${YELLOW}   • git commit -m \"message [skip-docs]\"${NC}"
  echo -e "${YELLOW}   • git commit --no-verify (skips ALL hooks)${NC}"
  exit 1
fi
echo ""

# ============================================================================
# BACKEND VALIDATION (Rails API)
# ============================================================================
# Check if any backend files are staged
BACKEND_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep "^donation_tracker_api/" || true)

if [ -n "$BACKEND_FILES" ]; then
  echo -e "${BLUE}🔍 Backend Validation (Rails)${NC}"

  if bash scripts/pre-commit-backend.sh; then
    echo -e "${GREEN}✓ Backend validation passed${NC}"
  else
    echo -e "${RED}✗ Backend validation failed${NC}"
    echo ""
    echo -e "${YELLOW}💡 Tip: Your work is backed up at: $BACKUP_PATH.patch${NC}"
    echo -e "${YELLOW}   To recover: git apply $BACKUP_PATH.patch${NC}"
    exit 1
  fi
  echo ""
fi

# ============================================================================
# FRONTEND VALIDATION (React)
# ============================================================================
# Check if any frontend files are staged
FRONTEND_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep "^donation_tracker_frontend/" || true)

if [ -n "$FRONTEND_FILES" ]; then
  echo -e "${BLUE}🔍 Frontend Validation (React)${NC}"

  if bash scripts/pre-commit-frontend.sh; then
    echo -e "${GREEN}✓ Frontend validation passed${NC}"
  else
    echo -e "${RED}✗ Frontend validation failed${NC}"
    echo ""
    echo -e "${YELLOW}💡 Tip: Your work is backed up at: $BACKUP_PATH.patch${NC}"
    echo -e "${YELLOW}   To recover: git apply $BACKUP_PATH.patch${NC}"
    exit 1
  fi
  echo ""
fi

# ============================================================================
# SENSITIVE FILES CHECK
# ============================================================================
echo -e "${BLUE}🔒 Sensitive Files Check${NC}"
SENSITIVE_FILES=$(git diff --cached --name-only | grep -E "(master\.key|\.pem|\.crt|secret|credential)$" || true)

if [ -n "$SENSITIVE_FILES" ]; then
  echo -e "${RED}✗ Sensitive files detected in commit:${NC}"
  echo "$SENSITIVE_FILES"
  exit 1
fi
echo -e "${GREEN}✓ No sensitive files detected${NC}"
echo ""

# ============================================================================
# SUCCESS
# ============================================================================
echo -e "${GREEN}✅ All pre-commit validations passed!${NC}"
echo -e "${YELLOW}📝 Note: Unstaged changes remain in your working directory (no stashing)${NC}"

exit 0
