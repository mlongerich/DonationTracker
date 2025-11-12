## [TICKET-095] Remove Debug Logging from Production Code

**Status:** 🔵 In Progress
**Priority:** 🔴 High
**Effort:** XS (Extra Small)
**Created:** 2025-11-11
**Dependencies:** None

### User Story
As a developer, I want to remove console.log statements from production code so that the browser console is clean and performance is optimized.

### Problem Statement
Debug logging statements (console.log) are still present in production code, causing console clutter and potential performance impact.

**Code Smell:** Debug code left in production
**Issue:** console.log statements in DonationList.tsx and ChildrenPage.tsx
**Impact:** Console clutter, performance impact in production

### Locations to Fix

#### 1. DonationList.tsx (lines 45-49)
```typescript
// src/components/DonationList.tsx:45-49
const DonationList: React.FC<DonationListProps> = ({
  donations,
  // ...
}) => {
  console.log(
    '[DonationList] Rendering with donations:',
    donations?.length,
    'items'
  );
  // ...
};
```

#### 2. ChildrenPage.tsx (line 100)
```typescript
// src/pages/ChildrenPage.tsx:100
const handleArchive = async (id: number) => {
  try {
    await apiClient.post(`/api/children/${id}/archive`);
    // ...
  } catch (err: any) {
    // ...
    console.error('Failed to archive child:', err);
  }
};
```

**Note:** The `console.error` in ChildrenPage is in an error handler and may be intentional, but should be evaluated.

### Acceptance Criteria
- [ ] Remove all `console.log` statements from production code
- [ ] Keep `console.error` only in error boundaries and critical error handlers (if needed)
- [ ] Consider adding proper error logging service if needed
- [ ] Run ESLint to catch any remaining console statements
- [ ] All existing tests pass

### Technical Approach

#### 1. Remove Debug Logging from DonationList
```typescript
// Before:
const DonationList: React.FC<DonationListProps> = ({
  donations,
  paginationMeta,
  onPageChange,
  onDateRangeChange,
  onDonorChange,
  onPaymentMethodChange,
}) => {
  console.log(
    '[DonationList] Rendering with donations:',
    donations?.length,
    'items'
  );
  // ...
};

// After:
const DonationList: React.FC<DonationListProps> = ({
  donations,
  paginationMeta,
  onPageChange,
  onDateRangeChange,
  onDonorChange,
  onPaymentMethodChange,
}) => {
  // Remove console.log - component logic begins here
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  // ...
};
```

#### 2. Evaluate console.error in ChildrenPage
```typescript
// Current:
const handleArchive = async (id: number) => {
  try {
    await apiClient.post(`/api/children/${id}/archive`);
    refetchWithCurrentFilters();
    setLocalError(null);
  } catch (err: any) {
    if (err.response?.status === 422) {
      setLocalError(
        err.response.data.errors?.join(', ') || 'Failed to archive child'
      );
    } else {
      setLocalError('Failed to archive child');
    }
    console.error('Failed to archive child:', err);  // Should we keep this?
  }
};
```

**Decision Options:**
- **Option A:** Remove it (error is shown to user via setLocalError)
- **Option B:** Keep it for debugging (but only in development)
- **Option C:** Use proper error logging service (Sentry, LogRocket, etc.)

**Recommendation:** Option A - Remove it since error is already shown to user

#### 3. Add ESLint Rule
```json
// .eslintrc.json (verify this rule is active)
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

**Note:** This rule should warn on console.log but allow console.warn/error. Adjust based on team preference.

### Benefits
- **Performance**: No unnecessary console.log calls in production
- **Professionalism**: Clean browser console for users
- **Best Practices**: Follows industry standards
- **Debugging**: Forces use of proper debugging tools (React DevTools, breakpoints)

### Testing Strategy

```bash
# 1. Search for all console statements
grep -r "console\." src/

# 2. Run ESLint
npm run lint

# 3. Verify all tests pass
npm test

# 4. Manual verification
# - Open app in browser
# - Open DevTools console
# - Navigate through all pages
# - Verify no debug logs appear
```

### Files to Modify
- `src/components/DonationList.tsx` (REMOVE console.log)
- `src/pages/ChildrenPage.tsx` (EVALUATE console.error)

### Alternative: Development-Only Logging

If debugging logs are valuable during development, use environment check:

```typescript
// src/utils/logger.ts (NEW - optional)
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
  }
};

// Usage:
import { logger } from '../utils/logger';

const DonationList: React.FC<DonationListProps> = ({ donations }) => {
  logger.log('[DonationList] Rendering with donations:', donations?.length, 'items');
  // This will only log in development
};
```

**Decision:** Start with simple removal. Add logger utility if debugging becomes difficult.

### Related Tickets
- Part of CODE_SMELL_ANALYSIS initiative
- Identified in code smell review on 2025-11-11

### Notes
- Quick win - takes <10 minutes to fix
- Should be done before deploying to production
- Consider setting up proper error monitoring (Sentry) in future
- After this fix, run `grep -r "console\." src/` to ensure none remain
