## [TICKET-135] Fix [skip-docs] Commit Message Tag in Pre-Commit Hook

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Effort:** S (Small - 30min to 1 hour)
**Created:** 2025-12-07

### User Story
As a developer, I want the `[skip-docs]` tag in my commit message to bypass documentation validation so I can commit test fixes and minor changes without needing to use environment variables.

### Problem Statement

The pre-commit hook documentation check is supposed to support `[skip-docs]` tag in commit messages, but it currently doesn't work. Users must use `SKIP_DOC_CHECK=1` environment variable instead.

**Current Behavior:**
```bash
git commit -m "fix: test updates [skip-docs]"
# ❌ Still triggers documentation validation failure
```

**Expected Behavior:**
```bash
git commit -m "fix: test updates [skip-docs]"
# ✅ Should bypass documentation check
```

**Workaround:**
```bash
SKIP_DOC_CHECK=1 git commit -m "fix: test updates"
# ✅ Works but requires environment variable
```

### Acceptance Criteria

- [ ] `[skip-docs]` tag anywhere in commit message bypasses documentation validation
- [ ] Case-insensitive matching (e.g., `[SKIP-DOCS]`, `[Skip-Docs]`)
- [ ] Works in first line or anywhere in commit message body
- [ ] Environment variable `SKIP_DOC_CHECK=1` continues to work
- [ ] Update CLAUDE.md documentation with both bypass methods
- [ ] Test all scenarios:
  - `[skip-docs]` at end of first line
  - `[skip-docs]` in commit message body
  - Mixed case variations
  - Environment variable still works

### Technical Approach

**Location:** `scripts/pre-commit-doc-check.sh`

**Implementation:**
1. Read the commit message from `.git/COMMIT_EDITMSG`
2. Check for `[skip-docs]` tag (case-insensitive)
3. If found, exit 0 (bypass validation)
4. If not found, continue with existing validation logic

**Pseudo-code:**
```bash
# Get commit message
COMMIT_MSG=$(cat .git/COMMIT_EDITMSG)

# Check for [skip-docs] tag (case-insensitive)
if echo "$COMMIT_MSG" | grep -qi '\[skip-docs\]'; then
  echo "✓ [skip-docs] tag detected - bypassing documentation validation"
  exit 0
fi

# Existing validation logic...
```

### Files to Modify

- `scripts/pre-commit-doc-check.sh` - Add [skip-docs] tag detection
- `CLAUDE.md` - Update "Documentation Check Bypass Options" section with clarified instructions

### Related Tickets

- TICKET-126: Intelligent Pre-Commit Documentation Validation (introduced the bypass options)

### Notes

- This is a developer experience improvement
- The feature was documented but not implemented
- Low priority since environment variable workaround exists
- Should be quick fix (mostly adding tag detection logic)

---

## Change Log

**2025-12-07: Created**
- Issue discovered when trying to commit E2E test fixes for TICKET-127
- `[skip-docs]` tag didn't work, had to use `SKIP_DOC_CHECK=1` instead
