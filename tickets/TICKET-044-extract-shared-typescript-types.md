## [TICKET-044] Extract Shared TypeScript Types to Central Location

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small)
**Created:** 2025-10-19
**Dependencies:** None

### User Story
As a developer, I want TypeScript interfaces and types defined in a central location so that I can maintain consistency across components and avoid duplicate type definitions.

### Problem Statement
Common interfaces are duplicated across multiple files:

**Donor interface** - Duplicated in 5+ files:
- `App.tsx:25-30`
- `DonorList.tsx`
- `DonorForm.tsx`
- `DonorMergeModal.tsx`
- `DonorAutocomplete.tsx`

**Donation interface** - Duplicated in 4+ files:
- `App.tsx:32-38`
- `DonationList.tsx`
- `DonationForm.tsx`
- Component tests

**Project interface** - Duplicated in 4+ files:
- `ProjectsPage.tsx:10-16`
- `ProjectForm.tsx:7-13`
- `ProjectList.tsx:3-8`
- Component tests

**PaginationMeta interface** - Duplicated in 3+ files:
- `App.tsx:40-45`
- `DonationList.tsx`
- Could be used in other paginated lists

**Code Smell:** Duplicate type definitions across 21+ files
**Issue:** Changes to types require updates in multiple locations, types can drift out of sync

### Acceptance Criteria
- [ ] Create `src/types/` directory
- [ ] Extract Donor interface to `src/types/donor.ts`
- [ ] Extract Donation interface to `src/types/donation.ts`
- [ ] Extract Project interface to `src/types/project.ts`
- [ ] Extract PaginationMeta interface to `src/types/pagination.ts`
- [ ] Create barrel export `src/types/index.ts`
- [ ] Update all components to import from `src/types/`
- [ ] Remove duplicate interface definitions
- [ ] All existing tests pass
- [ ] TypeScript compilation succeeds with no errors
- [ ] Update CLAUDE.md with type organization pattern

### Technical Approach

#### 1. Create Type Definitions

**src/types/donor.ts**
```typescript
/**
 * Represents a donor who contributes to the organization.
 */
export interface Donor {
  id: number;
  name: string;
  email: string;
  discarded_at?: string | null;
  merged_into_id?: number | null;
}

/**
 * Data required to create or update a donor.
 */
export interface DonorFormData {
  name: string;
  email: string;
}

/**
 * API response for donor merge operation.
 */
export interface DonorMergeResult {
  merged_donor: Donor;
  merged_count: number;
}
```

**src/types/donation.ts**
```typescript
/**
 * Represents a financial donation to the organization.
 */
export interface Donation {
  id: number;
  amount: string;
  date: string;
  donor_id: number;
  donor_name?: string;
  project_id?: number | null;
  project_title?: string;
  status?: string;
  description?: string;
}

/**
 * Data required to create or update a donation.
 */
export interface DonationFormData {
  amount: number;
  date: string;
  donor_id: number;
  project_id?: number | null;
  status?: string;
  description?: string;
}
```

**src/types/project.ts**
```typescript
/**
 * Project type enumeration matching backend enum.
 */
export type ProjectType = 'general' | 'campaign' | 'sponsorship';

/**
 * Represents a project or campaign for organizing donations.
 */
export interface Project {
  id: number;
  title: string;
  description?: string;
  project_type: ProjectType;
  system: boolean;
}

/**
 * Data required to create or update a project.
 */
export interface ProjectFormData {
  title: string;
  description?: string;
  project_type: string;
}
```

**src/types/pagination.ts**
```typescript
/**
 * Pagination metadata returned by Kaminari-paginated API endpoints.
 */
export interface PaginationMeta {
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

/**
 * Generic paginated API response structure.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

**src/types/api.ts**
```typescript
/**
 * Generic API error response structure.
 */
export interface ApiErrorResponse {
  errors: string[];
}

/**
 * API response for donors list endpoint.
 */
export interface DonorsApiResponse {
  donors: Donor[];
  meta: PaginationMeta;
}

/**
 * API response for donations list endpoint.
 */
export interface DonationsApiResponse {
  donations: Donation[];
  meta: PaginationMeta;
}

/**
 * API response for projects list endpoint.
 */
export interface ProjectsApiResponse {
  projects: Project[];
  meta: PaginationMeta;
}
```

**src/types/index.ts (Barrel Export)**
```typescript
// Donor types
export type { Donor, DonorFormData, DonorMergeResult } from './donor';

// Donation types
export type { Donation, DonationFormData } from './donation';

// Project types
export type { Project, ProjectType, ProjectFormData } from './project';

// Pagination types
export type { PaginationMeta, PaginatedResponse } from './pagination';

// API types
export type {
  ApiErrorResponse,
  DonorsApiResponse,
  DonationsApiResponse,
  ProjectsApiResponse,
} from './api';
```

#### 2. Update Imports Across Codebase

**Before (App.tsx):**
```typescript
interface Donor {
  id: number;
  name: string;
  email: string;
  discarded_at?: string | null;
}

interface Donation {
  id: number;
  amount: string;
  date: string;
  donor_id: number;
  donor_name?: string;
}

function App() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  // ...
}
```

**After (App.tsx):**
```typescript
import { Donor, Donation, PaginationMeta } from './types';

function App() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  // ...
}
```

**Component Updates:**
```typescript
// DonorForm.tsx
import { Donor, DonorFormData } from '../types';

// DonationForm.tsx
import { Donation, DonationFormData, Donor } from '../types';

// ProjectsPage.tsx
import { Project, ProjectFormData } from '../types';

// api/client.ts
import type {
  DonorsApiResponse,
  DonationsApiResponse,
  ProjectsApiResponse
} from '../types';
```

### Benefits
- **Single Source of Truth**: One definition per type
- **Type Safety**: Changes propagate automatically via TypeScript
- **Maintainability**: Update types in one location
- **Discoverability**: Easy to find all available types
- **Consistency**: Prevents type drift between components
- **Documentation**: Centralized JSDoc comments
- **Auto-completion**: Better IDE support with barrel exports
- **Future-Proof**: Easy to add validation schemas (Zod, Yup) later

### File Structure

```
src/
├── types/
│   ├── index.ts          # Barrel export
│   ├── donor.ts          # Donor-related types
│   ├── donation.ts       # Donation-related types
│   ├── project.ts        # Project-related types
│   ├── pagination.ts     # Pagination types
│   └── api.ts            # API response types
├── components/
│   ├── DonorForm.tsx     # Imports from '../types'
│   ├── DonationList.tsx  # Imports from '../types'
│   └── ...
├── pages/
│   └── ProjectsPage.tsx  # Imports from '../types'
└── api/
    └── client.ts         # Imports from '../types'
```

### Testing Strategy
- No new tests needed (type-only changes)
- Run `npm run type-check` to verify TypeScript compilation
- All existing component tests should pass unchanged
- Verify no TypeScript errors in IDE

### Migration Strategy

1. **Phase 1**: Create `src/types/` directory with all type files
2. **Phase 2**: Update barrel export (`src/types/index.ts`)
3. **Phase 3**: Update App.tsx imports (largest consumer)
4. **Phase 4**: Update component imports one-by-one
5. **Phase 5**: Update test file imports
6. **Phase 6**: Remove old interface definitions
7. **Phase 7**: Verify TypeScript compilation succeeds
8. **Phase 8**: Run all tests to ensure no regressions

### CLAUDE.md Updates

```markdown
### TypeScript Type Organization

**Central Type Definitions:**
- All shared types live in `src/types/`
- Use barrel export pattern (`src/types/index.ts`)
- Organize by domain: donor.ts, donation.ts, project.ts
- Include JSDoc comments for documentation

**Best Practices:**
- Never duplicate type definitions across files
- Import from `'../types'` using barrel export
- Use `interface` for object shapes
- Use `type` for unions, primitives, or composed types
- Add JSDoc comments for complex types

**Example:**
```typescript
// src/types/donor.ts
/**
 * Represents a donor who contributes to the organization.
 */
export interface Donor {
  id: number;
  name: string;
  email: string;
}

// src/components/DonorForm.tsx
import { Donor } from '../types';
```
```

### Files to Create
- `src/types/index.ts` (barrel export)
- `src/types/donor.ts`
- `src/types/donation.ts`
- `src/types/project.ts`
- `src/types/pagination.ts`
- `src/types/api.ts`

### Files to Modify (Remove Duplicate Interfaces)
- `src/App.tsx`
- `src/components/DonorForm.tsx`
- `src/components/DonorList.tsx`
- `src/components/DonorMergeModal.tsx`
- `src/components/DonorAutocomplete.tsx`
- `src/components/DonationForm.tsx`
- `src/components/DonationList.tsx`
- `src/components/ProjectForm.tsx`
- `src/components/ProjectList.tsx`
- `src/pages/ProjectsPage.tsx`
- `src/api/client.ts`
- All test files that define interfaces

### Future Enhancements
- Add runtime validation with Zod schemas
- Generate types from OpenAPI spec (backend contract)
- Add branded types for IDs (DonorId, DonationId)
- Extract utility types (AsyncState, FormState)
- Consider code generation from GraphQL schema if adopted

### Related Tickets
- Complements TICKET-032 (Custom Hooks) - hooks can import shared types
- Complements TICKET-041 (API Client Tests) - tests use shared types
- Part of code quality improvement initiative

### Notes
- This is a refactoring ticket (no functionality changes)
- TypeScript compiler will catch any import errors
- Use VSCode "Find All References" to track down all interface usages
- Consider adding ESLint rule to prevent local interface definitions for common types
