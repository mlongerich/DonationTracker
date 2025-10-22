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
        params: { include_sponsorships: true }
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add child/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add child/i }));
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
        params: { include_sponsorships: true }
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
        sponsorships: [
          { id: 1, donor_id: 10, donor_name: 'John Doe', child_id: 1, monthly_amount: '50.0', active: true }
        ]
      },
      {
        id: 2,
        name: 'Juan',
        created_at: '2025-01-02',
        updated_at: '2025-01-02',
        sponsorships: [
          { id: 2, donor_id: 20, donor_name: 'Jane Smith', child_id: 2, monthly_amount: '75.0', active: true }
        ]
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
      // Verify Maria's sponsorship is displayed
      expect(screen.getByText(/Sponsored by John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/\$50\/month/i)).toBeInTheDocument();

      // Verify Juan's sponsorship is displayed
      expect(screen.getByText(/Sponsored by Jane Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/\$75\/month/i)).toBeInTheDocument();
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
});
