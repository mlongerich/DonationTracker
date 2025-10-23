#!/usr/bin/env bash
# Native Git Commit-msg Hook
# Validates commit message format without stashing behavior

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the commit message file path (passed as argument by git)
COMMIT_MSG_FILE=$1

if [ ! -f "$COMMIT_MSG_FILE" ]; then
  echo -e "${RED}✗ Commit message file not found${NC}"
  exit 1
fi

# Get the root directory of the git repo
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo -e "${BLUE}Validating commit message format...${NC}"

# Run the validation script
if bash scripts/validate-commit-msg.sh "$COMMIT_MSG_FILE"; then
  echo -e "${GREEN}✓ Commit message format valid${NC}"
  exit 0
else
  echo -e "${RED}✗ Commit message format invalid${NC}"
  exit 1
fi
