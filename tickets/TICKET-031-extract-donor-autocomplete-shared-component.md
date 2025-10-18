## [TICKET-031] Extract DonorAutocomplete Shared Component

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Effort:** S (Small)
**Created:** 2025-10-18
**Completed:** 2025-10-18
**Dependencies:** None

### User Story
As a developer, I want to extract the duplicated donor autocomplete logic into a reusable component so that I can maintain a single source of truth and reduce code duplication.

### Problem Statement
The same donor autocomplete logic appears in two places:
1. `DonationForm.tsx:29-54` - For selecting donor when creating donation
2. `DonationList.tsx:63-87, 158-195` - For filtering donations by donor

**Code Smell:** Duplication of debounced search logic, option rendering, and loading states
**Issue:** Changes to autocomplete behavior require updating multiple files

### Acceptance Criteria
- [x] Create `DonorAutocomplete` shared component in `src/components/`
- [x] Component accepts configurable props (value, onChange, label, size, required, fullWidth)
- [x] Refactor `DonationForm` to use new shared component
- [x] Refactor `DonationList` to use new shared component
- [x] All existing functionality preserved (debounce, loading, no results text, email hiding)
- [x] Add comprehensive component tests (7 tests, all passing)
- [x] All existing tests pass
- [x] Update CLAUDE.md with shared component pattern (already documented)

### Technical Approach

#### 1. Create DonorAutocomplete Component

```tsx
// src/components/DonorAutocomplete.tsx
import { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  AutocompleteProps,
} from '@mui/material';
import apiClient from '../api/client';
import { shouldDisplayEmail } from '../utils/emailUtils';

export interface Donor {
  id: number;
  name: string;
  email: string;
}

interface DonorAutocompleteProps {
  value: Donor | null;
  onChange: (donor: Donor | null) => void;
  label?: string;
  required?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
}

const DonorAutocomplete: React.FC<DonorAutocompleteProps> = ({
  value,
  onChange,
  label = 'Donor',
  required = false,
  size = 'medium',
  fullWidth = true,
  error = false,
  helperText,
}) => {
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced search for donors
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchInput.trim()) {
        setLoading(true);
        try {
          const response = await apiClient.get('/api/donors', {
            params: {
              q: { name_or_email_cont: searchInput },
              per_page: 10,
            },
          });
          setDonorOptions(response.data.donors || []);
        } catch (error) {
          console.error('Failed to search donors:', error);
          setDonorOptions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setDonorOptions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const getOptionLabel = (option: Donor): string => {
    if (shouldDisplayEmail(option.email)) {
      return `${option.name} (${option.email})`;
    }
    return `${option.name} (No email provided)`;
  };

  return (
    <Autocomplete
      options={donorOptions}
      loading={loading}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={searchInput}
      onInputChange={(_, newInputValue) => setSearchInput(newInputValue)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          size={size}
          fullWidth={fullWidth}
          error={error}
          helperText={helperText}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      noOptionsText={
        searchInput ? 'No donors found' : 'Start typing to search donors'
      }
    />
  );
};

export default DonorAutocomplete;
```

#### 2. Refactor DonationForm

```tsx
// src/components/DonationForm.tsx (refactored)
import React, { useState } from 'react';
import { createDonation } from '../api/client';
import DonorAutocomplete, { Donor } from './DonorAutocomplete';

const DonationForm: React.FC<DonationFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonor) return;

    setSuccess(false);
    setIsSubmitting(true);

    try {
      await createDonation({
        amount: parseFloat(amount),
        date,
        donor_id: selectedDonor.id,
      });

      setSuccess(true);
      setAmount('');
      setSelectedDonor(null);
      setDate(new Date().toISOString().split('T')[0]);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to create donation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* amount and date inputs */}

      <DonorAutocomplete
        value={selectedDonor}
        onChange={setSelectedDonor}
        required={!selectedDonor}
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Donation'}
      </button>

      {success && <div role="alert">Donation created successfully!</div>}
    </form>
  );
};
```

#### 3. Refactor DonationList

```tsx
// src/components/DonationList.tsx (refactored)
import DonorAutocomplete, { Donor } from './DonorAutocomplete';

const DonationList: React.FC<DonationListProps> = ({
  donations,
  paginationMeta,
  onPageChange,
  onDateRangeChange,
  onDonorChange,
}) => {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  // ... other state

  const handleDonorChange = (newValue: Donor | null) => {
    setSelectedDonor(newValue);
    if (onDonorChange) {
      onDonorChange(newValue ? newValue.id : null);
    }
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setDateError(null);
    setSelectedDonor(null);
    if (onDateRangeChange) onDateRangeChange(null, null);
    if (onDonorChange) onDonorChange(null);
  };

  return (
    <div>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <DonorAutocomplete
          value={selectedDonor}
          onChange={handleDonorChange}
          size="small"
        />
        {/* date pickers and clear button */}
      </Stack>
      {/* donation list */}
    </div>
  );
};
```

### Benefits
- **DRY Principle**: Single implementation of autocomplete logic
- **Maintainability**: Changes in one place affect all usages
- **Reusability**: Can use in other forms/filters easily
- **Testability**: Component tested once, used everywhere
- **Consistency**: Same UX across all donor selections
- **Type Safety**: Exported Donor interface ensures consistency

### Testing Strategy

```tsx
// src/components/DonorAutocomplete.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonorAutocomplete from './DonorAutocomplete';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('DonorAutocomplete', () => {
  const mockOnChange = jest.fn();
  const mockDonors = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label', () => {
    render(
      <DonorAutocomplete value={null} onChange={mockOnChange} label="Select Donor" />
    );
    expect(screen.getByLabelText(/select donor/i)).toBeInTheDocument();
  });

  it('searches donors after typing with debounce', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: mockDonors },
    });

    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'John');

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/donors', {
        params: {
          q: { name_or_email_cont: 'John' },
          per_page: 10,
        },
      });
    });
  });

  it('displays loading indicator while searching', async () => {
    (apiClient.get as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'John');

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('calls onChange when donor selected', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: mockDonors },
    });

    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'John');

    await waitFor(() => {
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/john doe/i));

    expect(mockOnChange).toHaveBeenCalledWith(mockDonors[0]);
  });
});
```

### Files to Create
- `src/components/DonorAutocomplete.tsx` (NEW)
- `src/components/DonorAutocomplete.test.tsx` (NEW)

### Files to Modify
- `src/components/DonationForm.tsx` (REFACTOR - remove duplicate logic)
- `src/components/DonationList.tsx` (REFACTOR - remove duplicate logic)
- `src/components/DonationForm.test.tsx` (UPDATE for new component)
- `src/components/DonationList.test.tsx` (UPDATE for new component)
- `CLAUDE.md` (UPDATE - add shared component pattern)

### Future Enhancements
- Add configurable debounce delay prop
- Support multi-select for bulk operations
- Add custom option rendering (e.g., with avatars)
- Cache search results to reduce API calls
- Add clear button styling customization

### Related Tickets
- TICKET-032: Could use `useDebouncedValue` custom hook to further reduce logic
- Part of code quality improvement initiative

### Notes
- This is a refactoring ticket - no functionality changes
- All existing tests should pass with minimal updates
- Export Donor interface for type consistency across codebase
- Consider adding to component library/Storybook if implemented later
