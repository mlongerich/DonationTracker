#!/bin/bash
# Validate commit message follows our conventional commit format

COMMIT_MSG_FILE=$1

if [ -z "$COMMIT_MSG_FILE" ]; then
    echo "❌ Error: No commit message file provided"
    exit 1
fi

if [ ! -f "$COMMIT_MSG_FILE" ]; then
    echo "❌ Error: Commit message file not found: $COMMIT_MSG_FILE"
    exit 1
fi

# Read the first line of the commit message
FIRST_LINE=$(head -n 1 "$COMMIT_MSG_FILE")

# Check if it starts with one of our required prefixes
if ! echo "$FIRST_LINE" | grep -qE "^(backend|frontend|docs|feat|fix|chore|docker):"; then
    echo "❌ Commit message must start with one of: backend:, frontend:, docs:, feat:, fix:, chore:, docker:"
    echo "Your commit message starts with: $FIRST_LINE"
    exit 1
fi

exit 0
