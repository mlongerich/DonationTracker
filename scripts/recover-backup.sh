#!/usr/bin/env bash
# Recovery script for restoring backed up changes
# Use this if you lose work during a commit

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_DIR=".git/backups"

echo -e "${BLUE}🛡️  Git Hook Backup Recovery Tool${NC}"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo -e "${RED}✗ No backups found${NC}"
  echo "Backups are created automatically during commits"
  exit 1
fi

# List available backups
echo -e "${YELLOW}Available backups:${NC}"
ls -lh "$BACKUP_DIR"/*.patch 2>/dev/null | tail -10 | awk '{print $9, "(" $5 ")"}'

# If no argument, show most recent backup
if [ -z "$1" ]; then
  LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/pre-commit_*.patch 2>/dev/null | head -1)

  if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}✗ No backup patches found${NC}"
    exit 1
  fi

  echo ""
  echo -e "${YELLOW}Most recent backup: $LATEST_BACKUP${NC}"
  echo ""
  echo "Options:"
  echo "  1. View backup contents:  git apply --stat $LATEST_BACKUP"
  echo "  2. Check what would apply: git apply --check $LATEST_BACKUP"
  echo "  3. Apply backup:           git apply $LATEST_BACKUP"
  echo "  4. Apply staged changes:   git apply ${LATEST_BACKUP%.patch}.staged.patch"
  echo ""
  echo "To apply a specific backup:"
  echo "  bash scripts/recover-backup.sh <backup-file>"

  exit 0
fi

# Apply specific backup
BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}✗ Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

echo -e "${BLUE}Checking backup compatibility...${NC}"
if git apply --check "$BACKUP_FILE"; then
  echo -e "${GREEN}✓ Backup can be applied cleanly${NC}"
  echo ""
  echo -e "${YELLOW}Preview of changes:${NC}"
  git apply --stat "$BACKUP_FILE"
  echo ""
  read -p "Apply this backup? (yes/no): " confirm

  if [ "$confirm" = "yes" ]; then
    git apply "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup restored successfully!${NC}"
  else
    echo -e "${YELLOW}Cancelled${NC}"
  fi
else
  echo -e "${RED}✗ Backup conflicts with current working directory${NC}"
  echo ""
  echo "You may need to:"
  echo "  1. Stash or commit current changes first"
  echo "  2. Review the backup manually: cat $BACKUP_FILE"
  exit 1
fi
