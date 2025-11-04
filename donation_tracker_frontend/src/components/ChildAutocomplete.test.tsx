import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChildAutocomplete from './ChildAutocomplete';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('ChildAutocomplete', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders autocomplete input with label', () => {
    render(<ChildAutocomplete value={null} onChange={mockOnChange} />);

    expect(screen.getByLabelText(/child/i)).toBeInTheDocument();
  });

  it('searches for children when user types', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
      {
        id: 2,
        name: 'Mario',
        created_at: '2025-01-02',
        updated_at: '2025-01-02',
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: mockChildren },
    });

    const user = userEvent.setup();
    render(<ChildAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByLabelText(/child/i);
    await user.type(input, 'Mar');

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
        params: { q: { name_cont: 'Mar' }, per_page: 10 },
      });
    });
  });

  it('calls onChange when child is selected', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: mockChildren },
    });

    const user = userEvent.setup();
    render(<ChildAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByLabelText(/child/i);
    await user.type(input, 'Maria');

    await waitFor(() => {
      expect(screen.getByText('Maria')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Maria'));

    expect(mockOnChange).toHaveBeenCalledWith(mockChildren[0]);
  });

  it('displays loading indicator while searching', async () => {
    (apiClient.get as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const user = userEvent.setup();
    render(<ChildAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByLabelText(/child/i);
    await user.type(input, 'Maria');

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('shows "Type to search" when input is empty', async () => {
    render(<ChildAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    const user = userEvent.setup();

    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Type to search')).toBeInTheDocument();
    });
  });

  it('shows "Searching..." immediately while typing before debounce fires', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: [] },
    });

    const user = userEvent.setup();
    render(<ChildAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');

    // Type a single character
    await user.type(input, 'M');

    // Should show "Searching..." immediately, not "No results"
    expect(screen.getByText('Searching...')).toBeInTheDocument();
    expect(screen.queryByText('No results')).not.toBeInTheDocument();
  });

  it('shows "No results" when search returns empty', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: [] },
    });

    const user = userEvent.setup();
    render(<ChildAutocomplete value={null} onChange={mockOnChange} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'NonexistentChild');

    // Wait for API call to complete
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
        params: { q: { name_cont: 'NonexistentChild' }, per_page: 10 },
      });
    });

    // Then wait for "No results" to appear
    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument();
    });
  });
});
