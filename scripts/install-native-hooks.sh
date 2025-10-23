#!/usr/bin/env bash
# Install native Git hooks (replaces pre-commit framework)
# This eliminates stashing behavior that can cause data loss

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

echo -e "${BLUE}Installing Native Git Hooks...${NC}"
echo ""

# ============================================================================
# Step 1: Uninstall pre-commit framework if present
# ============================================================================
if command -v pre-commit &> /dev/null; then
  echo -e "${YELLOW}Uninstalling pre-commit framework...${NC}"
  pre-commit uninstall --hook-type pre-commit 2>/dev/null || true
  pre-commit uninstall --hook-type commit-msg 2>/dev/null || true
  echo -e "${GREEN}✓ Pre-commit framework uninstalled${NC}"
  echo ""
fi

# ============================================================================
# Step 2: Install pre-commit hook
# ============================================================================
echo -e "${BLUE}Installing pre-commit hook...${NC}"
cp scripts/native-pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo -e "${GREEN}✓ Pre-commit hook installed${NC}"

# ============================================================================
# Step 3: Install commit-msg hook
# ============================================================================
echo -e "${BLUE}Installing commit-msg hook...${NC}"
cp scripts/native-commit-msg.sh .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
echo -e "${GREEN}✓ Commit-msg hook installed${NC}"

# ============================================================================
# Step 4: Make scripts executable
# ============================================================================
echo -e "${BLUE}Making utility scripts executable...${NC}"
chmod +x scripts/native-pre-commit.sh
chmod +x scripts/native-commit-msg.sh
chmod +x scripts/recover-backup.sh
chmod +x scripts/pre-commit-backend.sh
chmod +x scripts/pre-commit-frontend.sh
chmod +x scripts/check-documentation.sh
chmod +x scripts/validate-commit-msg.sh
echo -e "${GREEN}✓ All scripts executable${NC}"

# ============================================================================
# Step 5: Create backup directory
# ============================================================================
mkdir -p .git/backups
echo -e "${GREEN}✓ Backup directory created${NC}"

# ============================================================================
# SUCCESS
# ============================================================================
echo ""
echo -e "${GREEN}✅ Native Git hooks installed successfully!${NC}"
echo ""
echo -e "${YELLOW}Key differences from pre-commit framework:${NC}"
echo "  • No stashing - unstaged changes always remain in working directory"
echo "  • Automatic backups before every commit (.git/backups/)"
echo "  • Recovery tool: bash scripts/recover-backup.sh"
echo "  • Faster execution (no framework overhead)"
echo ""
echo -e "${BLUE}Test the hooks:${NC}"
echo "  git commit --allow-empty -m 'test: verify native hooks work'"
echo ""
echo -e "${BLUE}Recover lost work:${NC}"
echo "  bash scripts/recover-backup.sh"
