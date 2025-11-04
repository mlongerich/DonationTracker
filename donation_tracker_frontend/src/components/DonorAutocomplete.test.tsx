import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonorAutocomplete from './DonorAutocomplete';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('DonorAutocomplete', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default label "Donor"', () => {
    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    expect(screen.getByLabelText(/donor/i)).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(
      <DonorAutocomplete
        value={null}
        onChange={mockOnChange}
        label="Select Donor"
      />
    );

    expect(screen.getByLabelText(/select donor/i)).toBeInTheDocument();
  });

  it('searches donors after typing with 300ms debounce', async () => {
    const mockDonors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: mockDonors },
    });

    const user = userEvent.setup();
    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'John');

    // Should not call immediately
    expect(apiClient.get).not.toHaveBeenCalled();

    // Should call after debounce delay
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
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { donors: [] } }), 1000)
        )
    );

    const user = userEvent.setup();
    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'John');

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('uses displayable_email from backend presenter', async () => {
    const donorsFromBackend = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@mailinator.com',
        displayable_email: null,
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        displayable_email: 'jane@example.com',
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: donorsFromBackend },
    });

    const user = userEvent.setup();
    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'J');

    await waitFor(() => {
      const listbox = screen.queryByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    const options = screen.getAllByRole('option');
    const allText = options.map((opt) => opt.textContent).join(' ');
    expect(allText).toContain('John Doe (No email provided)');
    expect(allText).toContain('Jane Smith (jane@example.com)');
  });

  it('renders with small size', () => {
    render(
      <DonorAutocomplete value={null} onChange={mockOnChange} size="small" />
    );

    const input = screen.getByLabelText(/donor/i);
    expect(input).toBeInTheDocument();
  });

  it('marks field as required when required prop is true', () => {
    render(
      <DonorAutocomplete value={null} onChange={mockOnChange} required={true} />
    );

    const input = screen.getByLabelText(/donor/i);
    expect(input).toBeRequired();
  });

  it('shows "Type to search" when input is empty', async () => {
    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    const user = userEvent.setup();

    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Type to search')).toBeInTheDocument();
    });
  });

  it('shows "Searching..." immediately while typing before debounce fires', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: [] },
    });

    const user = userEvent.setup();
    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');

    // Type a single character
    await user.type(input, 'J');

    // Should show "Searching..." immediately, not "No results"
    expect(screen.getByText('Searching...')).toBeInTheDocument();
    expect(screen.queryByText('No results')).not.toBeInTheDocument();
  });

  it('shows "No results" when search returns empty', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: [] },
    });

    const user = userEvent.setup();
    render(<DonorAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'NonexistentDonor');

    // Wait for API call to complete
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/donors', {
        params: {
          q: { name_or_email_cont: 'NonexistentDonor' },
          per_page: 10,
        },
      });
    });

    // Then wait for "No results" to appear
    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument();
    });
  });
});
