## [TICKET-129] Internationalization (i18n) and Test Resilience

**Status:** 🟢 Planned
**Priority:** 🟡 Medium
**Effort:** XL (Extra Large - 12-15 hours)
**Created:** 2025-11-19
**Dependencies:** None

### User Story
As a developer, I want all user-facing text managed through an internationalization framework and tests that rely on semantic attributes (aria-labels, data-testid) instead of hardcoded text, so that text changes don't break tests and future multi-language support is possible.

### Problem Statement

**Current Issues:**
1. **461 Cypress tests** use `cy.contains(text)` - fragile and language-dependent
2. **68+ hardcoded strings** scattered across components - difficult to maintain
3. **Only 17 aria-labels** - poor accessibility and test targeting
4. **Text changes require code edits** - no centralized text management
5. **Tests break when wording changes** - even minor text tweaks cause failures

**Example Problems:**
```tsx
// ❌ Current: Hardcoded text
<DialogTitle>Create New Donor</DialogTitle>
<Button>Submit</Button>

// ❌ Current: Text-dependent test
cy.contains('Create New Donor').should('be.visible');
cy.contains('button', /submit/i).click();
```

**Desired State:**
```tsx
// ✅ With i18n and aria-labels
<DialogTitle>{t('donor.createDialog.title')}</DialogTitle>
<Button type="submit" aria-label={t('common.actions.submit')}>
  {t('common.actions.submit')}
</Button>

// ✅ Resilient test
cy.get('[aria-label="Create new donor dialog"]').should('be.visible');
cy.get('button[type="submit"]').click();
```

### Acceptance Criteria

#### Phase 1: i18n Infrastructure Setup (2-3 hours)
- [ ] Install `react-i18next` and `i18next` packages
- [ ] Create `src/i18n/` directory structure
- [ ] Create `src/i18n/locales/en.json` (default language)
- [ ] Configure i18n in `src/i18n/config.ts`
- [ ] Wrap App with I18nextProvider in `src/index.tsx`
- [ ] Create `useTranslation` hook wrapper if needed
- [ ] Add i18n setup documentation to CLAUDE.md

#### Phase 2: Component Text Extraction (6-8 hours)

**2A: Dialogs and Modals (2 hours)**
- [ ] QuickEntityCreateDialog
  - Extract "Create New Entity", tab labels, error messages
  - Add aria-labels to tabs, close button, submit buttons
- [ ] QuickDonorCreateDialog
  - Extract "Create New Donor", form labels, buttons
  - Add aria-labels to all interactive elements
- [ ] SponsorshipModal
  - Extract dialog title, form labels, buttons
  - Add aria-labels for accessibility

**2B: Form Components (2 hours)**
- [ ] DonationForm
  - Extract labels: "Amount", "Date", "Donor", "Donation For", "Payment Method"
  - Extract button text: "Create Donation", "Creating..."
  - Extract success message: "Donation created successfully!"
  - Add aria-labels to autocompletes, icon buttons
- [ ] DonorForm
  - Extract "Name", "Email", "Submit", "Update Donor"
  - Add aria-labels
- [ ] ChildForm
  - Extract "Name", "Gender", submit button text
  - Add aria-labels
- [ ] ProjectForm
  - Extract "Title", "Description", "Project Type", buttons
  - Add aria-labels

**2C: List Components (1 hour)**
- [ ] DonationList, DonorList, ChildList, ProjectList, SponsorshipList
  - Extract empty state messages
  - Extract action button labels
  - Add aria-labels to interactive elements

**2D: Navigation and Pages (1 hour)**
- [ ] Navigation
  - Extract "Donors", "Donations", "Children", "Projects", "Sponsorships"
  - Add aria-labels to navigation links
- [ ] Page titles and headers
  - Extract all page-level headings
  - Add semantic aria-landmarks

#### Phase 3: Test Migration (4-5 hours)

**3A: Update Cypress E2E Tests (3 hours)**
- [ ] donation-entry.cy.ts (80 cy.contains calls)
  - Replace with aria-label selectors
  - Use button[type="submit"], input[type="..."] where appropriate
- [ ] donor-form.cy.ts, donor-merge.cy.ts, donor-archive.cy.ts
  - Migrate to semantic selectors
- [ ] children-sponsorship.cy.ts, project-crud.cy.ts
  - Migrate to semantic selectors
- [ ] navigation.cy.ts, filtering tests
  - Migrate to semantic selectors
- [ ] Verify 100% E2E test pass rate (58/58 tests)

**3B: Update Jest Unit Tests (1-2 hours)**
- [ ] QuickEntityCreateDialog.test.tsx
  - Use `screen.getByRole()` with aria-labels
- [ ] QuickDonorCreateDialog.test.tsx
  - Use semantic queries
- [ ] DonationForm.test.tsx
  - Update all text-based queries
- [ ] All other component tests
  - Migrate away from text-based selectors
- [ ] Verify 100% unit test pass rate

**3C: Documentation (30 min)**
- [ ] Add i18n patterns to CLAUDE.md
- [ ] Add test selector guidelines to CLAUDE.md (prefer aria-label > data-testid > text)
- [ ] Document translation key naming conventions

### Technical Approach

#### 1. i18n Setup

**Install:**
```bash
npm install react-i18next i18next
```

**Directory Structure:**
```
src/
  i18n/
    config.ts           # i18n configuration
    locales/
      en.json           # English translations (default)
```

**Configuration (`src/i18n/config.ts`):**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes
    }
  });

export default i18n;
```

**Translation Keys Structure (`src/i18n/locales/en.json`):**
```json
{
  "common": {
    "actions": {
      "submit": "Submit",
      "cancel": "Cancel",
      "save": "Save",
      "create": "Create",
      "update": "Update",
      "delete": "Delete"
    },
    "labels": {
      "name": "Name",
      "email": "Email",
      "date": "Date",
      "amount": "Amount"
    }
  },
  "donor": {
    "createDialog": {
      "title": "Create New Donor",
      "ariaLabel": "Create new donor dialog"
    },
    "form": {
      "name": "Name",
      "email": "Email"
    }
  },
  "donation": {
    "form": {
      "amount": "Amount",
      "date": "Date",
      "donor": "Donor",
      "donationFor": "Donation For",
      "paymentMethod": "Payment Method",
      "createButton": "Create Donation",
      "creating": "Creating..."
    },
    "success": "Donation created successfully!"
  },
  "entity": {
    "createDialog": {
      "title": "Create New Entity",
      "ariaLabel": "Create project or child dialog",
      "tabs": {
        "child": "Create Child",
        "project": "Create Project"
      }
    }
  }
}
```

#### 2. Component Pattern

**Before:**
```tsx
<Dialog open={open} onClose={onClose}>
  <DialogTitle>Create New Donor</DialogTitle>
  <DialogContent>
    <TextField label="Name" />
    <TextField label="Email" />
    <Button type="submit">Submit</Button>
  </DialogContent>
</Dialog>
```

**After:**
```tsx
import { useTranslation } from 'react-i18next';

const QuickDonorCreateDialog = ({ open, onClose }) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="donor-dialog-title"
    >
      <DialogTitle id="donor-dialog-title">
        {t('donor.createDialog.title')}
      </DialogTitle>
      <DialogContent>
        <TextField
          label={t('donor.form.name')}
          aria-label={t('donor.form.name')}
        />
        <TextField
          label={t('donor.form.email')}
          type="email"
          aria-label={t('donor.form.email')}
        />
        <Button
          type="submit"
          aria-label={t('common.actions.submit')}
        >
          {t('common.actions.submit')}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
```

#### 3. Test Pattern

**Before (Fragile):**
```typescript
// ❌ Breaks when text changes
cy.contains('Create New Donor').should('be.visible');
cy.contains('button', /submit/i).click();

// ❌ Breaks with wording changes
expect(screen.getByText('Create New Donor')).toBeInTheDocument();
```

**After (Resilient):**
```typescript
// ✅ Semantic selector - survives text changes
cy.get('[aria-labelledby="donor-dialog-title"]').should('be.visible');
cy.get('button[type="submit"]').click();

// ✅ Role-based query - resilient
expect(screen.getByRole('dialog', { name: /donor/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
```

**Selector Priority (CLAUDE.md Guidelines):**
1. **Semantic HTML**: `button[type="submit"]`, `input[type="email"]`
2. **ARIA labels**: `[aria-label="..."]`, `[aria-labelledby="..."]`
3. **Roles**: `screen.getByRole('button', { name: ... })`
4. **data-testid**: Only when semantic/aria not possible
5. **Text content**: ❌ Avoid - use only for dynamic content verification

### Implementation Strategy

**Phase 1: Infrastructure (TDD Not Required)**
1. Install packages
2. Create i18n config and initial translation file
3. Set up provider
4. Test with one simple component

**Phase 2: Component Migration (One Component at a Time)**
1. Pick a component (start with QuickDonorCreateDialog - smallest)
2. Extract all text to translation keys
3. Add aria-labels
4. Update component tests to use new selectors
5. Verify tests pass
6. Move to next component

**Phase 3: E2E Test Migration (One File at a Time)**
1. Pick an E2E test file (start with smallest)
2. Update all cy.contains() calls to semantic selectors
3. Run tests, fix any issues
4. Move to next file

### Files to Create
- `src/i18n/config.ts` (NEW ~40 lines)
- `src/i18n/locales/en.json` (NEW ~200-300 lines)
- `src/i18n/index.ts` (NEW ~5 lines - barrel export)

### Files to Modify

**Phase 1:**
- `package.json` (+2 dependencies)
- `src/index.tsx` (+5 lines for provider)

**Phase 2 (Component Text Extraction):**
- `src/components/QuickEntityCreateDialog.tsx` (~15 text strings)
- `src/components/QuickDonorCreateDialog.tsx` (~10 text strings)
- `src/components/SponsorshipModal.tsx` (~12 text strings)
- `src/components/DonationForm.tsx` (~20 text strings)
- `src/components/DonorForm.tsx` (~8 text strings)
- `src/components/ChildForm.tsx` (~6 text strings)
- `src/components/ProjectForm.tsx` (~10 text strings)
- `src/components/Navigation.tsx` (~5 text strings)
- `src/components/*List.tsx` (5 files, ~20 strings total)
- `src/pages/*.tsx` (~10 text strings)

**Phase 3 (Test Migration):**
- `cypress/e2e/donation-entry.cy.ts` (~80 cy.contains calls)
- `cypress/e2e/donor-*.cy.ts` (4 files, ~120 cy.contains calls)
- `cypress/e2e/children-sponsorship.cy.ts` (~60 cy.contains calls)
- `cypress/e2e/*.cy.ts` (remaining files, ~200 cy.contains calls)
- `src/components/*.test.tsx` (~100 text-based queries)

### Testing Strategy

**After Each Component Migration:**
1. Run component unit tests: `npm test -- ComponentName.test.tsx`
2. Verify tests pass
3. Run E2E tests if component used in E2E flows

**After Complete Migration:**
1. Run all unit tests: `npm test`
2. Run all E2E tests: `npm run cypress:e2e`
3. Verify 100% pass rate (58/58 E2E, all Jest tests)
4. Manual smoke test of all features

### Estimated Time

- **Phase 1 (Infrastructure):** 2-3 hours
  - Package installation and config: 1 hour
  - Initial translation file creation: 1 hour
  - Provider setup and testing: 0.5-1 hour

- **Phase 2 (Component Migration):** 6-8 hours
  - Dialogs/Modals: 2 hours
  - Forms: 2 hours
  - Lists: 1 hour
  - Navigation/Pages: 1 hour
  - Component test updates: 2 hours

- **Phase 3 (E2E Test Migration):** 4-5 hours
  - Cypress test migration: 3-4 hours
  - Verification and fixes: 1 hour

- **Total:** 12-16 hours

### Success Criteria

**Must Have:**
- [ ] All user-facing text managed through i18n (zero hardcoded strings)
- [ ] All interactive elements have meaningful aria-labels
- [ ] Zero Cypress tests using `cy.contains(hardcoded_text)`
- [ ] 100% E2E test pass rate (58/58 tests)
- [ ] 100% Jest test pass rate
- [ ] Documentation in CLAUDE.md for i18n and test selector patterns

**Nice to Have:**
- [ ] Translation key naming convention documented
- [ ] Helper utilities for common translations
- [ ] VS Code snippets for i18n usage

### Related Tickets

- TICKET-021: Quick Entity Creation (current) - contains hardcoded dialog text
- TICKET-036: Error Boundary Pattern - has hardcoded error messages
- TICKET-125: Accessibility E2E Tests - will benefit from aria-labels

### Notes

- **Breaking Change:** This will touch almost every component and test file
- **Migration Strategy:** One component at a time to minimize risk
- **Backward Compatibility:** Not required - single-developer project
- **Future Proofing:** Enables easy multi-language support later
- **Test Reliability:** Tests become resilient to copy changes
- **Accessibility Win:** Forcing aria-labels improves accessibility compliance

### Key Learnings

From TICKET-021 (current ticket):
- Cypress tests heavily rely on text matching (`cy.contains`)
- Text changes (e.g., "Create New Project" → "Create New Entity") require extensive test updates
- Better to use semantic selectors from the start
- aria-labels provide dual benefit: accessibility + test resilience

### Success Criteria

**Phase 1 Complete When:**
- i18n infrastructure working
- One component fully migrated as proof-of-concept
- Translation key structure validated

**Phase 2 Complete When:**
- All components using i18n
- All interactive elements have aria-labels
- Component tests updated and passing

**Phase 3 Complete When:**
- All E2E tests using semantic selectors
- All Jest tests using semantic/role-based queries
- 100% test pass rate maintained
- CLAUDE.md updated with patterns and guidelines
