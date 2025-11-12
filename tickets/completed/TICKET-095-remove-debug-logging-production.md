## [TICKET-095] Remove Debug Logging from Production Code

**Status:** ✅ Complete
**Priority:** 🔴 High
**Effort:** S (Small - expanded to all pages)
**Created:** 2025-11-11
**Updated:** 2025-11-12 (expanded scope to all console statements)
**Completed:** 2025-11-12
**Dependencies:** None

### User Story
As a developer, I want to remove console.log statements from production code so that the browser console is clean and performance is optimized.

### Problem Statement
Debug logging statements (console.log and console.error) are present throughout production code, causing console clutter and potential performance impact.

**Code Smell:** Debug code left in production
**Issue:** 1 console.log + 9 console.error statements across multiple files
**Impact:** Console clutter, performance impact, unprofessional production environment

### Locations to Fix

#### 1. DonationList.tsx (lines 45-49) - console.log
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

#### 2. ChildrenPage.tsx (line 100) - console.error
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

#### 3. DonorsPage.tsx (lines 66, 83, 92) - 3x console.error
```typescript
// src/pages/DonorsPage.tsx:66
const fetchDonors = async () => {
  try {
    // ...
  } catch (error) {
    console.error('Failed to fetch donors:', error);
  }
};

// src/pages/DonorsPage.tsx:83
const handleArchive = async (id: number) => {
  try {
    // ...
  } catch (err: any) {
    console.error('Failed to archive donor:', err);
  }
};

// src/pages/DonorsPage.tsx:92
const handleRestore = async (id: number) => {
  try {
    // ...
  } catch (error) {
    console.error('Failed to restore donor:', error);
  }
};
```

#### 4. DonationsPage.tsx (line 54) - console.error
```typescript
// src/pages/DonationsPage.tsx:54
const fetchDonations = async () => {
  try {
    // ...
  } catch (error) {
    console.error('Failed to fetch donations:', error);
  }
};
```

#### 5. SponsorshipsPage.tsx (line 66) - console.error
```typescript
// src/pages/SponsorshipsPage.tsx:66
const handleSubmit = async (data: SponsorshipFormData) => {
  try {
    // ...
  } catch (err: any) {
    console.error('Failed to create sponsorship:', err);
  }
};
```

#### 6. ProjectsPage.tsx (lines 39, 70, 84, 110) - 4x console.error
```typescript
// src/pages/ProjectsPage.tsx:39
const fetchProjects = async () => {
  try {
    // ...
  } catch (error) {
    console.error('Failed to fetch projects:', error);
  }
};

// src/pages/ProjectsPage.tsx:70
const handleSubmit = async (data: ProjectFormData) => {
  try {
    // ...
  } catch (error) {
    console.error('Failed to create/update project:', error);
  }
};

// src/pages/ProjectsPage.tsx:84
const handleDelete = async (id: number) => {
  try {
    // ...
  } catch (error) {
    console.error('Failed to delete project:', error);
  }
};

// src/pages/ProjectsPage.tsx:110
const handleArchive = async (id: number) => {
  try {
    // ...
  } catch (err: any) {
    console.error('Failed to archive project:', err);
  }
};
```

### Summary of All Console Statements

**Total:** 10 console statements across 6 files
- **1x console.log**: DonationList.tsx (line 45)
- **9x console.error**: ChildrenPage (1), DonorsPage (3), DonationsPage (1), SponsorshipsPage (1), ProjectsPage (4)

**Decision:** Remove ALL - errors are already shown to users via state management (Alert components)

### Acceptance Criteria
- [ ] Remove console.log from DonationList.tsx (1 location)
- [ ] Remove console.error from ChildrenPage.tsx (1 location)
- [ ] Remove console.error from DonorsPage.tsx (3 locations)
- [ ] Remove console.error from DonationsPage.tsx (1 location)
- [ ] Remove console.error from SponsorshipsPage.tsx (1 location)
- [ ] Remove console.error from ProjectsPage.tsx (4 locations)
- [ ] Run `grep -r "console\." src/` to verify all removed
- [ ] Run ESLint to catch any remaining console statements
- [ ] All existing tests pass (no tests depend on console statements)

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
- `src/components/DonationList.tsx` (REMOVE 1 console.log)
- `src/pages/ChildrenPage.tsx` (REMOVE 1 console.error)
- `src/pages/DonorsPage.tsx` (REMOVE 3 console.error)
- `src/pages/DonationsPage.tsx` (REMOVE 1 console.error)
- `src/pages/SponsorshipsPage.tsx` (REMOVE 1 console.error)
- `src/pages/ProjectsPage.tsx` (REMOVE 4 console.error)

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
- Takes ~15-20 minutes to fix all 10 locations
- Should be done before deploying to production
- All error handling already shown to users via Alert components
- Consider setting up proper error monitoring (Sentry) in future
- After this fix, run `grep -r "console\." src/` to ensure none remain
- **Expanded scope 2025-11-12**: Originally identified 2 files, found 6 total files with console statements
