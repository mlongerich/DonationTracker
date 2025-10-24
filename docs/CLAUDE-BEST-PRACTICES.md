# Claude Code Best Practices for CLAUDE.md Files

*Guidelines for optimizing CLAUDE.md files for token efficiency and Claude Code performance*

**Created:** 2025-10-24
**Research sources:** Claude Code documentation, community best practices, internal experience

---

## Core Principle

**CLAUDE.md files become part of Claude's prompt context** - they should be refined like any frequently used prompt, avoiding extensive content without iterating on effectiveness.

---

## Token Optimization Strategies

### 1. Keep Files Concise and Focused

**Target:** 300-600 lines for CLAUDE.md
**Current best:** ~500 lines achieves optimal balance

**Why:**
- Claude Code loads CLAUDE.md into working memory
- Larger files consume more tokens per interaction
- Excessive context slows down response time
- Forces focus on truly essential conventions

### 2. Use External Documentation Structure

**Pattern:**
```
CLAUDE.md (core conventions, quick reference)
├── Brief principle or rule
├── Link to detailed docs
└── Quick example if essential

docs/
├── ARCHITECTURE.md (diagrams, workflows)
├── PATTERNS.md (code examples, implementations)
├── TESTING.md (methodologies, frameworks)
└── DOCKER.md (setup, troubleshooting)
```

**Benefits:**
- Claude can selectively read detailed docs when needed
- CLAUDE.md stays fast and always-loaded
- Detailed examples available but not consuming base context

### 3. Specify File Boundaries

**In CLAUDE.md, explicitly state:**
- Which files/directories are essential
- Which directories are forbidden (node_modules, vendor, etc.)
- Where to find specific information

**Example:**
```markdown
## Essential Files
- CLAUDE.md - Core conventions (this file)
- DonationTracking.md - Project specifications
- tickets/ - Active work tracking
- docs/ - Detailed documentation

## Detailed Documentation
See docs/ directory:
- Architecture & workflows → docs/ARCHITECTURE.md
- Code patterns & examples → docs/PATTERNS.md
- Testing methodology → docs/TESTING.md
- Docker setup → docs/DOCKER.md
```

### 4. What to Include in CLAUDE.md

**✅ MUST INCLUDE (always in context):**
- Project structure overview
- Commit message conventions
- Core development workflow (TDD, vertical slices)
- Pre-commit requirements
- Common bash commands
- Code style guidelines (brief)
- Links to detailed documentation

**⚠️ BRIEF REFERENCE (link to details):**
- Testing framework overview → link to docs/TESTING.md
- Architecture diagrams → link to docs/ARCHITECTURE.md
- Code patterns → link to docs/PATTERNS.md
- Setup instructions → link to docs/DOCKER.md

**❌ MOVE TO DOCS (reference by link only):**
- Detailed code examples (>10 lines)
- Multiple Mermaid diagrams
- Troubleshooting guides
- Step-by-step tutorials
- Framework-specific deep-dives
- Historical context or rationale essays

### 5. Use Mermaid Diagrams Strategically

**In CLAUDE.md:**
- 1-2 critical diagrams only (e.g., TDD workflow, project structure)
- Keep diagrams simple (<20 nodes)

**In docs/ARCHITECTURE.md:**
- Comprehensive diagram collection
- Detailed workflows
- Complex visualizations

**Why:** Mermaid diagrams consume significant tokens. One complex diagram can be 50-100 tokens.

---

## Context Management Tools

### Built-in Commands
- `/compact` - Summarize conversation history, reduce context
- `/clear` - Reset conversation, start fresh
- `/memory` - Access external files (tickets, docs)

### Memory Files Strategy
- **tickets/**: Persist across /compact (external files)
- **BACKLOG.md**: Capture ideas, then /compact
- **docs/**: Available via /memory when needed

---

## Proven Patterns from This Project

### Historical Cleanup Success (Commit b68546a)

**Before cleanup:**
- CLAUDE.md: 1324 lines (too large)
- All content in single file
- Slow context loading

**After cleanup:**
- CLAUDE.md: ~500 lines (streamlined)
- Created docs/ARCHITECTURE.md (diagrams)
- Created docs/PATTERNS.md (code examples)
- Created docs/TESTING.md (methodology)
- Created docs/DOCKER.md (setup/troubleshooting)
- Created docs/CLAUDE-DETAILED.md (complete archive)

**Results:**
- 60% reduction in CLAUDE.md size
- Faster Claude Code responses
- All information preserved
- Better organization

### When to Clean Up CLAUDE.md

**Triggers:**
1. File exceeds 800 lines
2. Adding new sections feels cramped
3. Multiple detailed code examples accumulating
4. Troubleshooting guides growing
5. Historical context bloating file

**Process:**
1. Identify auxiliary content (examples, diagrams, explanations)
2. Move to appropriate docs/ file
3. Replace with brief principle + link
4. Verify all information accessible
5. Test that Claude can find linked content
6. Commit with `docs:` prefix

---

## Self-Contained CLAUDE.md Assessment & Cleanup Process

**Critical Insight (Learned 2025-10-24):**

CLAUDE.md is loaded once at Claude Code startup and **must be self-contained**. Claude does NOT automatically follow links to other files. Links to `/docs` are helpful for optional deep-dives, but they are NOT replacements for essential information.

### Revised Target Metrics

**Optimal Size: 700-800 lines** (revised from initial 300-600)

**Why the change:**
- Self-contained essentials > minimal size
- All decision criteria must be in CLAUDE.md
- Developers must be able to make decisions without reading other files
- Links provide optional exploration, not required reading

**Quality > Quantity:**
- Self-contained actionable patterns: ✅ Priority #1
- File size optimization: ⚠️ Secondary concern
- If choosing between, always pick self-containment

### Self-Containment Checklist

For CLAUDE.md to be self-contained, it must include:

**For Each Pattern:**
- ✅ Decision criteria (when to use class vs instance method)
- ✅ "When to use" guidance (specific scenarios)
- ✅ Brief code example showing the pattern (5-15 lines)
- ❌ Extended code examples (>30 lines) → Move to docs/PATTERNS.md

**For Each Tool/Framework:**
- ✅ What it does (purpose)
- ✅ When to use it (criteria)
- ✅ How to use it (command or pattern)
- ❌ Full setup instructions → Move to docs/DOCKER.md or docs/TESTING.md

**For Each Convention:**
- ✅ The rule (what to do)
- ✅ Why it exists (rationale)
- ✅ How to follow it (example)
- ❌ Historical context → Move to docs/CLAUDE-DETAILED.md

**For Each Architecture Decision:**
- ✅ File structure (where things live)
- ✅ Pattern to follow (code template)
- ✅ Best practices (3-6 bullets)
- ❌ Full implementation examples → Move to docs/PATTERNS.md

### Assessment Process (Repeatable for Future Cleanups)

**Step 1: Check Metrics**
```bash
wc -l CLAUDE.md  # If >800, cleanup needed
```

**Step 2: Verify Self-Containment**

Can someone answer these questions from CLAUDE.md alone?

- ✅ When should I use class vs instance methods for services?
- ✅ What concerns are already implemented and what do they do?
- ✅ When should I add a database index?
- ✅ Where do TypeScript types live and how should I organize them?
- ✅ How do I implement React Router multi-page architecture?
- ✅ When should I extract a shared component?
- ✅ How do I verify a test isn't a false positive? (Intentional Breaking)
- ✅ What commands do I run for testing?
- ✅ How do I recover from a failed commit?

If any answer is "See docs/X.md" without the actual answer in CLAUDE.md, **self-containment is broken**.

**Step 3: Identify Auxiliary Content**

What can be moved to `/docs`:
- Mermaid diagrams (keep 0-1 critical ones)
- Extended code examples (>30 lines)
- Troubleshooting guides
- Step-by-step tutorials
- Historical rationale
- Framework setup details
- Detailed explanations

**Step 4: Perform Cleanup**

For each auxiliary item:
1. Identify destination in `/docs` (ARCHITECTURE, PATTERNS, TESTING, DOCKER)
2. Move content to appropriate file
3. In CLAUDE.md, keep:
   - Decision criteria
   - When to use
   - Brief example (if essential)
   - Optional link to `/docs` for deep-dive
4. Verify the essential info remains

**Step 5: Verify No Information Loss**

Run verification tests:

```bash
# Check all essential patterns present
grep -c 'Service Object\|Controller Concern\|Presenter\|Database Index' CLAUDE.md

# Check decision criteria exists
grep -c 'When to use:\|When to Add:\|When to Extract:' CLAUDE.md

# Check code examples preserved
grep -c '```ruby\|```typescript\|```tsx' CLAUDE.md

# Verify self-containment
# Can you answer the 9 questions above from CLAUDE.md alone?
```

### Verification Tests (Based on 2025-10-24 Cleanup)

**Test 1: Service Objects**
- ❓ Question: When should I use class methods vs instance methods?
- ✅ Answer in CLAUDE.md: "Class methods: Simple, stateless operations" / "Instance methods: Multi-step workflows, complex validation, state tracking"
- ✅ Has code example for both patterns

**Test 2: Controller Concerns**
- ❓ Question: What concerns are already implemented?
- ✅ Answer in CLAUDE.md: Lists PaginationConcern and RansackFilterable with method signatures
- ✅ Shows usage example with includes

**Test 3: Database Indexing**
- ❓ Question: When should I add a database index?
- ✅ Answer in CLAUDE.md: 4 specific criteria (WHERE >1000 rows, ORDER BY frequently, foreign keys, uniqueness)
- ✅ Has naming conventions

**Test 4: TypeScript Types**
- ❓ Question: Where do types live and how organize them?
- ✅ Answer in CLAUDE.md: src/types/ with barrel export, lists all 6 files, shows example
- ✅ Has 5 best practices

**Test 5: React Router**
- ❓ Question: How do I implement multi-page routing?
- ✅ Answer in CLAUDE.md: File structure shown, BrowserRouter pattern with code, 6 best practices
- ✅ Can implement without reading docs

**Test 6: Shared Components**
- ❓ Question: When should I extract a shared component?
- ✅ Answer in CLAUDE.md: 4 extraction criteria (2+ components, clear interface, 50+ lines)
- ✅ Shows TDD approach and example

**Test 7: Intentional Breaking**
- ❓ Question: How do I verify a test isn't a false positive?
- ✅ Answer in CLAUDE.md: 5-step workflow, when to use (4 scenarios), benefits
- ✅ Can apply technique immediately

**Test 8: Git Hooks**
- ❓ Question: How do I recover from a failed commit?
- ✅ Answer in CLAUDE.md: Command shown (`bash scripts/recover-backup.sh`)
- ✅ Backup system explained

**Test 9: Testing Commands**
- ❓ Question: What commands run tests?
- ✅ Answer in CLAUDE.md: All commands listed (rspec, npm test, cypress:run)
- ✅ Can run tests immediately

If all 9 tests pass, CLAUDE.md is self-contained. ✅

### Common Mistakes to Avoid

**❌ WRONG: Replacing essential info with links**
```markdown
## Service Objects
See docs/PATTERNS.md for service object patterns.
```

**✅ CORRECT: Self-contained with optional deep-dive**
```markdown
## Service Objects

**When to use:**
- Class methods: Simple, stateless operations
- Instance methods: Multi-step workflows, complex validation

[Brief code example showing both]

See docs/PATTERNS.md for extended examples and edge cases.
```

**❌ WRONG: Removing decision criteria**
```markdown
## Database Indexing
Add indexes for performance. See docs/PATTERNS.md for guidelines.
```

**✅ CORRECT: Criteria present, docs optional**
```markdown
## Database Indexing

**When to Add:**
1. Column in WHERE clause with >1000 rows
2. Column in ORDER BY frequently
3. Foreign keys (Rails doesn't auto-index!)
4. Uniqueness validation queries

See docs/project/data-models.md for current indexes and monitoring.
```

**❌ WRONG: Removing code examples**
```markdown
## React Router
Use React Router for multi-page apps. See docs/PATTERNS.md for examples.
```

**✅ CORRECT: Pattern shown, docs have extended examples**
```markdown
## React Router

**Pattern:**
[Essential code showing BrowserRouter + Layout + Outlet]

**Best Practices:**
- Keep App.tsx minimal
- Page-level state
- E2E tests for routes

See docs/PATTERNS.md for full implementation examples.
```

**Summary of Mistakes:**
- ❌ Assuming Claude will read linked files
- ❌ Removing decision criteria and keeping only examples
- ❌ Removing "when to use" guidance
- ❌ Prioritizing file size over self-containment
- ✅ Keep: decision criteria, when to use, essential examples
- ✅ Move: extended examples, diagrams, troubleshooting, history
- ✅ Links: Optional exploration, not required reading

### Updated Historical Success

**2025-10-24 Cleanup: Self-Contained Essentials Approach**

**Before:**
- CLAUDE.md: 1,324 lines
- Missing critical decision criteria
- Too many links without self-contained info

**After:**
- CLAUDE.md: 719 lines (46% reduction)
- **All 9 verification tests pass** ✅
- Self-contained decision criteria for all patterns
- Links provide optional deep-dives, not required reading

**Key Changes:**
- Added "Intentional Breaking" test technique (critical for TDD)
- Restored service object decision criteria (class vs instance)
- Included controller concerns list with method signatures
- Added database indexing criteria (4 specific rules)
- Showed TypeScript type organization with file list
- Included React Router pattern with code
- Kept all essential code examples

**Results:**
- Developers can make decisions without reading `/docs` ✅
- All patterns actionable from CLAUDE.md alone ✅
- 46% size reduction while improving self-containment ✅
- Links enhance but don't replace essential information ✅

**Lesson Learned:**
Self-contained essentials (700-800 lines) > minimal file size (300-600 lines).
Claude doesn't follow links automatically - CLAUDE.md must stand alone.

---

## Measuring Success

### Quantitative Metrics
- **CLAUDE.md size:** 700-800 lines optimal (self-contained essentials)
- **Self-containment:** All 9 verification tests must pass
- **Token usage:** Monitor per-interaction consumption
- **Response time:** Faster with focused context

### Qualitative Metrics
- Can you find conventions quickly?
- Are detailed examples available when needed?
- Does Claude reference docs correctly?
- Is information well-organized?

---

## Template: CLAUDE.md Structure

```markdown
# Claude Development Conventions & Best Practices

## Project Structure & Repository Strategy
[Brief overview + link to docs/ARCHITECTURE.md]

## Ticket & Task Management System
[Brief workflow + link to tickets/README.md]

## Commit Message Conventions
[Full conventions - essential, keep in CLAUDE.md]

## Test-Driven Development (TDD)
[Core principles + link to docs/TESTING.md for details]

## Code Quality Standards
[Brief standards + link to docs/PATTERNS.md for examples]

## Containerization Standards
[Brief requirements + link to docs/DOCKER.md]

## Development Workflow
[Core workflow steps + link to docs/ARCHITECTURE.md]

## Development Commands
[Keep full quick reference - frequently used]

## Security Requirements
[Brief requirements - essential to remember]

## Detailed Documentation
See docs/ directory:
- Architecture & workflows → docs/ARCHITECTURE.md
- Code patterns & examples → docs/PATTERNS.md
- Testing methodology → docs/TESTING.md
- Docker setup & troubleshooting → docs/DOCKER.md
```

---

## Anti-Patterns to Avoid

❌ **Including every possible code example** - Link to docs instead
❌ **Duplicating information** - Single source of truth per topic
❌ **Historical essays** - Focus on current conventions
❌ **Troubleshooting novels** - Move to docs/TROUBLESHOOTING.md
❌ **Multiple complex diagrams** - Keep 1-2 critical ones
❌ **"Just in case" content** - Include only what's frequently needed

---

## Maintenance Schedule

**Monthly:** Review CLAUDE.md size, move new examples to docs
**Per Feature:** Update docs, keep CLAUDE.md brief
**Per Cleanup:** Follow commit b68546a pattern

---

## References

- [Claude Code Official Documentation](https://docs.anthropic.com/claude-code)
- [Token Optimization Best Practices](https://claudelog.com/faqs/how-to-optimize-claude-code-token-usage/)
- [Large Codebase Optimization](https://github.com/anthropics/claude-code/issues/403)
- Internal commit: b68546a (successful CLAUDE.md cleanup pattern)

---

*Last updated: 2025-10-24*
