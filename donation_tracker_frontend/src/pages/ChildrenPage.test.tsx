import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChildrenPage from './ChildrenPage';
import apiClient from '../api/client';

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ChildrenPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children management heading', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        children: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    expect(screen.getByText(/children management/i)).toBeInTheDocument();
  });

  it('fetches children on mount', async () => {
    const mockChildren = [
      { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01' }
    ];
    mockedApiClient.get.mockResolvedValue({
      data: {
        children: mockChildren,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/children', {
        params: expect.objectContaining({
          include_sponsorships: true,
          page: 1,
          per_page: 10,
        }),
      });
    });
  });

  it('creates a new child', async () => {
    const user = userEvent.setup();
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          children: [],
          meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          children: [{ id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [] }],
          meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
        },
      });
    mockedApiClient.post.mockResolvedValue({
      data: {
        child: { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01' },
      },
    });

    render(<ChildrenPage />);

    // Form should be always visible (no "Add Child" button)
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/name/i), 'Maria');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/children', { child: { name: 'Maria' } });
    });
  }, 10000);

  it('updates an existing child', async () => {
    const user = userEvent.setup();
    const mockChildren = [
      { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [] }
    ];
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          children: mockChildren,
          meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          children: [{ id: 1, name: 'Maria Updated', created_at: '2025-01-01', updated_at: '2025-01-02', sponsorships: [] }],
          meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
        },
      });
    mockedApiClient.put.mockResolvedValue({
      data: {
        child: { id: 1, name: 'Maria Updated', created_at: '2025-01-01', updated_at: '2025-01-02' },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(screen.getByText('Maria')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Maria Updated');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockedApiClient.put).toHaveBeenCalledWith('/api/children/1', { child: { name: 'Maria Updated' } });
    });
  });

  it('deletes a child', async () => {
    const user = userEvent.setup();
    const mockChildren = [
      { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [], can_be_deleted: true }
    ];
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          children: mockChildren,
          meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          children: [],
          meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
        },
      });
    mockedApiClient.delete.mockResolvedValue({ data: {} });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(screen.getByText('Maria')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockedApiClient.delete).toHaveBeenCalledWith('/api/children/1');
    });
  });

  it('loads children with sponsorships in single request', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        sponsorships: [
          { id: 1, donor_id: 1, donor_name: 'John Doe', child_id: 1, monthly_amount: '50.0', active: true }
        ]
      },
      {
        id: 2,
        name: 'Juan',
        created_at: '2025-01-02',
        updated_at: '2025-01-02',
        sponsorships: []
      }
    ];

    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        children: mockChildren,
        meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/children', {
        params: expect.objectContaining({
          include_sponsorships: true,
          page: 1,
          per_page: 10,
        }),
      });
    });
  });

  it('parses sponsorships from nested response correctly', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        can_be_deleted: false,
        sponsorships: [
          { id: 1, donor_id: 10, donor_name: 'John Doe', child_id: 1, monthly_amount: '50.0', active: true }
        ]
      },
      {
        id: 2,
        name: 'Juan',
        created_at: '2025-01-02',
        updated_at: '2025-01-02',
        can_be_deleted: false,
        sponsorships: [
          { id: 2, donor_id: 20, donor_name: 'Jane Smith', child_id: 2, monthly_amount: '75.0', active: true }
        ]
      }
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        children: mockChildren,
        meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 10 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      // Verify both children names are displayed
      expect(screen.getByText('Maria')).toBeInTheDocument();
      expect(screen.getByText('Juan')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify sponsorships are displayed (text might be split across elements)
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/\$0\.50\/mo/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/\$0\.75\/mo/i)).toBeInTheDocument();
    });
  });

  it('displays sponsorship info and allows adding sponsors', async () => {
    const mockChildren = [
      { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [] }
    ];

    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        children: mockChildren,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(screen.getByText(/no active sponsor/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add sponsor/i })).toBeInTheDocument();
    });
  });

  it('opens sponsorship modal when Add Sponsor button clicked', async () => {
    const user = userEvent.setup();
    const mockChildren = [
      { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [] }
    ];

    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        children: mockChildren,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add sponsor/i })).toBeInTheDocument();
    });

    const addSponsorButton = screen.getByRole('button', { name: /add sponsor/i });
    await user.click(addSponsorButton);

    expect(screen.getByText(/add sponsor for maria/i)).toBeInTheDocument();
  });

  it('renders Show Archived Children checkbox', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        children: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/show archived children/i)).toBeInTheDocument();
    });
  });

  it('fetches children with include_discarded param when checkbox is checked', async () => {
    const user = userEvent.setup();
    mockedApiClient.get.mockResolvedValue({
      data: {
        children: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/show archived children/i)).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/show archived children/i);
    await user.click(checkbox);

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/children', {
        params: expect.objectContaining({
          include_sponsorships: true,
          include_discarded: 'true',
          page: 1,
          per_page: 10,
        }),
      });
    });
  });

  it('displays archived child with "Archived" chip', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        sponsorships: [],
        can_be_deleted: true,
        discarded_at: '2025-01-15T10:00:00Z'
      }
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        children: mockChildren,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(screen.getByText('Maria')).toBeInTheDocument();
    });

    // Look for Archived chip specifically (not just the word "archived" anywhere)
    const chips = screen.queryAllByText('Archived');
    expect(chips.length).toBeGreaterThan(0);
  });

  it('shows restore button for archived children', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        sponsorships: [],
        can_be_deleted: true,
        discarded_at: '2025-01-15T10:00:00Z'
      }
    ];

    mockedApiClient.get.mockResolvedValue({
      data: {
        children: mockChildren,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });

    render(<ChildrenPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
    });
  });

  describe('Archive error handling', () => {
    it('shows error snackbar when archive fails with 422', async () => {
      const user = userEvent.setup();
      const mockChildren = [
        {
          id: 1,
          name: 'Maria',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          sponsorships: [],
          can_be_deleted: false
        }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: {
          children: mockChildren,
          meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
        },
      });

      mockedApiClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: { errors: ['Cannot archive child with active sponsorships'] },
        },
      });

      render(<ChildrenPage />);

      await waitFor(() => {
        expect(screen.getByText('Maria')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Error snackbar should appear with message
      await waitFor(() => {
        expect(screen.getByText('Cannot archive child with active sponsorships')).toBeInTheDocument();
      });
    });

    it('displays generic error message when API error has no details', async () => {
      const user = userEvent.setup();
      const mockChildren = [
        {
          id: 1,
          name: 'Maria',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          sponsorships: [],
          can_be_deleted: false
        }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: {
          children: mockChildren,
          meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
        },
      });

      mockedApiClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: {},
        },
      });

      render(<ChildrenPage />);

      await waitFor(() => {
        expect(screen.getByText('Maria')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Error snackbar should appear with generic message
      await waitFor(() => {
        expect(screen.getByText('Failed to archive child')).toBeInTheDocument();
      });
    });

    it('error snackbar closes when user clicks close button', async () => {
      const user = userEvent.setup();
      const mockChildren = [
        {
          id: 1,
          name: 'Maria',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          sponsorships: [],
          can_be_deleted: false
        }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: {
          children: mockChildren,
          meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
        },
      });

      mockedApiClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: { errors: ['Cannot archive child with active sponsorships'] },
        },
      });

      render(<ChildrenPage />);

      await waitFor(() => {
        expect(screen.getByText('Maria')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Cannot archive child with active sponsorships')).toBeInTheDocument();
      });

      // Click close button on alert
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByText('Cannot archive child with active sponsorships')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search functionality', () => {
    it('renders search field', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: {
          children: [],
          meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
        },
      });

      render(<ChildrenPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
      });
    });

    it('updates search query state when typing in search field', async () => {
      const user = userEvent.setup();
      mockedApiClient.get.mockResolvedValue({
        data: {
          children: [],
          meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
        },
      });

      render(<ChildrenPage />);

      const searchField = await screen.findByPlaceholderText(/search by name/i);
      await user.type(searchField, 'Maria');

      expect(searchField).toHaveValue('Maria');
    });

    it('triggers API call with search param after debounce delay', async () => {
      const user = userEvent.setup();

      mockedApiClient.get.mockResolvedValue({
        data: {
          children: [],
          meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
        },
      });

      render(<ChildrenPage />);

      const searchField = await screen.findByPlaceholderText(/search by name/i);
      await user.type(searchField, 'Maria');

      // Wait for debounce (300ms) plus some buffer
      await new Promise(resolve => setTimeout(resolve, 350));

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/api/children', {
          params: expect.objectContaining({
            q: { name_cont: 'Maria' },
            page: 1,
            per_page: 10,
          }),
        });
      });
    });
  });

  describe('Pagination', () => {
    it('displays pagination when total_pages > 1', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: {
          children: [
            { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [] },
          ],
          meta: { total_count: 25, total_pages: 3, current_page: 1, per_page: 10 },
        },
      });

      render(<ChildrenPage />);

      await waitFor(() => {
        // MUI Pagination renders as navigation element
        const pagination = screen.getByRole('navigation');
        expect(pagination).toBeInTheDocument();
      });
    });

    it('hides pagination when total_pages <= 1', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: {
          children: [
            { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [] },
          ],
          meta: { total_count: 5, total_pages: 1, current_page: 1, per_page: 10 },
        },
      });

      render(<ChildrenPage />);

      await waitFor(() => {
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      });
    });

    it('triggers API call with new page number when page changes', async () => {
      const user = userEvent.setup();
      mockedApiClient.get.mockResolvedValue({
        data: {
          children: [
            { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [] },
          ],
          meta: { total_count: 25, total_pages: 3, current_page: 1, per_page: 10 },
        },
      });

      render(<ChildrenPage />);

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // Click page 2 button
      const page2Button = screen.getByRole('button', { name: 'Go to page 2' });
      await user.click(page2Button);

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/api/children', {
          params: expect.objectContaining({
            page: 2,
            per_page: 10,
          }),
        });
      });
    });

    it('resets to page 1 when search query changes', async () => {
      const user = userEvent.setup();

      mockedApiClient.get.mockResolvedValue({
        data: {
          children: [
            { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', sponsorships: [] },
          ],
          meta: { total_count: 25, total_pages: 3, current_page: 1, per_page: 10 },
        },
      });

      render(<ChildrenPage />);

      // Navigate to page 2 first
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      const page2Button = screen.getByRole('button', { name: 'Go to page 2' });
      await user.click(page2Button);

      // Now search - should reset to page 1
      const searchField = await screen.findByPlaceholderText(/search by name/i);
      await user.type(searchField, 'Maria');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/api/children', {
          params: expect.objectContaining({
            page: 1,  // Should reset to page 1
            q: { name_cont: 'Maria' },
          }),
        });
      });
    });
  });
});
