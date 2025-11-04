import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DonorsPage from './DonorsPage';
import apiClient from '../api/client';

// Mock API client
jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  mergeDonors: jest.fn(),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('DonorsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders Donor Management heading', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/donor management/i)).toBeInTheDocument();
  });

  it('fetches donors on mount', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/donors', {
        params: expect.objectContaining({
          page: 1,
          per_page: 10,
        }),
      });
    });
  });

  it('renders donor list with fetched data', async () => {
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        displayable_email: 'jane@example.com',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('renders search input field', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    expect(
      screen.getByPlaceholderText(/search by name or email/i)
    ).toBeInTheDocument();
  });

  it('debounces search query by 300ms', async () => {
    const user = userEvent.setup({ delay: null });

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    // Clear initial mount API call
    mockedApiClient.get.mockClear();

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);

    // Type in search box
    await user.type(searchInput, 'John');

    // API should not be called immediately after typing
    expect(mockedApiClient.get).not.toHaveBeenCalled();

    // Fast-forward time by 300ms to trigger debounce
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve(); // Let useEffect run
    });

    // Now API should be called with search params
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/donors',
        expect.objectContaining({
          params: expect.objectContaining({
            q: { name_or_email_cont: 'John' },
          }),
        })
      );
    });
  });

  it('renders Show Archived Donors checkbox', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/show archived donors/i)).toBeInTheDocument();
  });

  it('renders pagination when multiple pages exist', async () => {
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: {
          total_count: 25,
          total_pages: 3,
          current_page: 1,
          per_page: 10,
        },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Pagination should be visible with 3 pages
    const pagination = screen.getByRole('navigation');
    expect(pagination).toBeInTheDocument();
  });

  it('renders DonorForm for adding/editing donors', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    // DonorForm should have name and email inputs
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('archives donor when archive is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    mockedApiClient.delete.mockResolvedValue({});

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click archive button
    const archiveButton = screen.getByRole('button', { name: /archive/i });
    await user.click(archiveButton);

    // API delete should be called
    expect(mockedApiClient.delete).toHaveBeenCalledWith('/api/donors/1');
  });

  it('restores donor when restore is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
        discarded_at: '2024-01-01',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    mockedApiClient.post.mockResolvedValue({});

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click restore button
    const restoreButton = screen.getByRole('button', { name: /restore/i });
    await user.click(restoreButton);

    // API post should be called
    expect(mockedApiClient.post).toHaveBeenCalledWith('/api/donors/1/restore');
  });

  it('shows merge button when 2 or more donors selected', async () => {
    const user = userEvent.setup({ delay: null });
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        displayable_email: 'jane@example.com',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Merge button should not be visible initially
    expect(
      screen.queryByRole('button', { name: /merge/i })
    ).not.toBeInTheDocument();

    // Get donor checkboxes (skip "Show Archived" checkbox at index 0)
    const checkboxes = screen.getAllByRole('checkbox');
    const donorCheckboxes = checkboxes.slice(1); // Skip first checkbox (Show Archived)

    // Select first donor checkbox
    await user.click(donorCheckboxes[0]);

    // Still no merge button with only 1 selected
    expect(
      screen.queryByRole('button', { name: /merge/i })
    ).not.toBeInTheDocument();

    // Select second donor checkbox
    await user.click(donorCheckboxes[1]);

    // Now merge button should appear
    expect(screen.getByRole('button', { name: /merge/i })).toBeInTheDocument();
  });

  it('opens merge modal when merge button clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        displayable_email: 'jane@example.com',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select both donors
    const checkboxes = screen.getAllByRole('checkbox');
    const donorCheckboxes = checkboxes.slice(1);
    await user.click(donorCheckboxes[0]);
    await user.click(donorCheckboxes[1]);

    // Click merge button
    const mergeButton = screen.getByRole('button', { name: /merge/i });
    await user.click(mergeButton);

    // Merge modal should be visible
    expect(screen.getByText(/merge donors/i)).toBeInTheDocument();
  });

  it('merges donors when merge confirmed', async () => {
    const user = userEvent.setup({ delay: null });
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        displayable_email: 'jane@example.com',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    const { mergeDonors } = require('../api/client');
    mergeDonors.mockResolvedValue({});

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select both donors
    const checkboxes = screen.getAllByRole('checkbox');
    const donorCheckboxes = checkboxes.slice(1);
    await user.click(donorCheckboxes[0]);
    await user.click(donorCheckboxes[1]);

    // Click merge button
    const mergeButton = screen.getByRole('button', { name: /merge/i });
    await user.click(mergeButton);

    // Click confirm button in modal
    const confirmButton = screen.getByRole('button', {
      name: /confirm merge/i,
    });
    await user.click(confirmButton);

    // mergeDonors should be called with selected IDs
    expect(mergeDonors).toHaveBeenCalledWith([1, 2], expect.any(Object));

    // Modal should close and selections cleared
    await waitFor(() => {
      expect(screen.queryByText(/merge donors/i)).not.toBeInTheDocument();
    });
  });

  it('passes donor to DonorForm when edit button clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Form should be pre-filled with donor data
    expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
    // Button should say "Update"
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });

  it('clears editing state when Cancel button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        donors: mockDonors,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Verify form is in edit mode
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Verify form returned to add mode
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cancel/i })
    ).not.toBeInTheDocument();
  });

  it('refreshes donor list after successful form submission', async () => {
    const user = userEvent.setup({ delay: null });
    const initialDonors = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
    ];
    const updatedDonors = [
      {
        id: 2,
        name: 'New Donor',
        email: 'new@example.com',
        displayable_email: 'new@example.com',
      },
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        displayable_email: 'john@example.com',
      },
    ];

    let callCount = 0;
    mockedApiClient.get.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Initial fetch
        return Promise.resolve({
          data: {
            donors: initialDonors,
            meta: {
              total_count: 1,
              total_pages: 1,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      // After submission - fetch again with new donor
      return Promise.resolve({
        data: {
          donors: updatedDonors,
          meta: {
            total_count: 2,
            total_pages: 1,
            current_page: 1,
            per_page: 10,
          },
        },
      });
    });

    mockedApiClient.post.mockResolvedValue({
      status: 201,
      data: {
        id: 2,
        name: 'New Donor',
        email: 'new@example.com',
        displayable_email: 'new@example.com',
      },
    });

    render(
      <BrowserRouter>
        <DonorsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Fill in and submit form
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(nameInput, 'New Donor');
    await user.type(emailInput, 'new@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Verify new donor appears in list (indicating refresh occurred)
    await waitFor(() => {
      expect(screen.getByText('New Donor')).toBeInTheDocument();
    });
  });

  describe('Archive error handling', () => {
    it('shows error snackbar when archive fails with 422', async () => {
      const user = userEvent.setup({ delay: null });
      const mockDonors = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          displayable_email: 'john@example.com',
        },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: {
          donors: mockDonors,
          meta: {
            total_count: 1,
            total_pages: 1,
            current_page: 1,
            per_page: 10,
          },
        },
      });

      mockedApiClient.delete.mockRejectedValue({
        response: {
          status: 422,
          data: { errors: ['Cannot archive donor with active sponsorships'] },
        },
      });

      render(
        <BrowserRouter>
          <DonorsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Error snackbar should appear with message
      await waitFor(() => {
        expect(
          screen.getByText('Cannot archive donor with active sponsorships')
        ).toBeInTheDocument();
      });
    });

    it('displays generic error message when API error has no details', async () => {
      const user = userEvent.setup({ delay: null });
      const mockDonors = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          displayable_email: 'john@example.com',
        },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: {
          donors: mockDonors,
          meta: {
            total_count: 1,
            total_pages: 1,
            current_page: 1,
            per_page: 10,
          },
        },
      });

      mockedApiClient.delete.mockRejectedValue({
        response: {
          status: 422,
          data: {},
        },
      });

      render(
        <BrowserRouter>
          <DonorsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Error snackbar should appear with generic message
      await waitFor(() => {
        expect(screen.getByText('Failed to archive donor')).toBeInTheDocument();
      });
    });

    it('error snackbar closes when user clicks close button', async () => {
      const user = userEvent.setup({ delay: null });
      const mockDonors = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          displayable_email: 'john@example.com',
        },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: {
          donors: mockDonors,
          meta: {
            total_count: 1,
            total_pages: 1,
            current_page: 1,
            per_page: 10,
          },
        },
      });

      mockedApiClient.delete.mockRejectedValue({
        response: {
          status: 422,
          data: { errors: ['Cannot archive donor with active sponsorships'] },
        },
      });

      render(
        <BrowserRouter>
          <DonorsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(
          screen.getByText('Cannot archive donor with active sponsorships')
        ).toBeInTheDocument();
      });

      // Click close button on alert
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Error should be gone
      await waitFor(() => {
        expect(
          screen.queryByText('Cannot archive donor with active sponsorships')
        ).not.toBeInTheDocument();
      });
    });
  });
});
