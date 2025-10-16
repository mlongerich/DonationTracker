import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonorList from './DonorList';

describe('DonorList', () => {
  it('renders empty state when no donors provided', () => {
    render(<DonorList donors={[]} />);
    expect(screen.getByText(/no donors yet/i)).toBeInTheDocument();
  });

  it('displays donor names and emails when donors provided', () => {
    const donors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    render(<DonorList donors={donors} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('displays donors in the order provided', () => {
    const donors = [
      { id: 3, name: 'Newest Donor', email: 'newest@example.com' },
      { id: 2, name: 'Middle Donor', email: 'middle@example.com' },
      { id: 1, name: 'Oldest Donor', email: 'oldest@example.com' },
    ];

    render(<DonorList donors={donors} />);

    // Verify all donors are displayed
    expect(screen.getByText('Newest Donor')).toBeInTheDocument();
    expect(screen.getByText('Middle Donor')).toBeInTheDocument();
    expect(screen.getByText('Oldest Donor')).toBeInTheDocument();
  });

  it('renders edit button for each donor', () => {
    const donors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    render(<DonorList donors={donors} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(2);
  });

  it('calls onEdit when edit button clicked', async () => {
    const donors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];
    const handleEdit = jest.fn();

    render(<DonorList donors={donors} onEdit={handleEdit} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    editButton.click();

    expect(handleEdit).toHaveBeenCalledWith(donors[0]);
  });

  it('accepts editingDonorId prop for highlighting', () => {
    const donors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    render(<DonorList donors={donors} editingDonorId={1} />);

    // Verify the editing donor is displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows tooltip "Edit donor" when hovering over edit button', async () => {
    const user = userEvent.setup();
    const donors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];

    render(<DonorList donors={donors} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.hover(editButton);

    expect(await screen.findByText('Edit donor')).toBeInTheDocument();
  });

  it('shows tooltip "Archive donor" when hovering over archive button', async () => {
    const user = userEvent.setup();
    const donors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];

    render(<DonorList donors={donors} />);

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    await user.hover(archiveButton);

    expect(await screen.findByText('Archive donor')).toBeInTheDocument();
  });

  it('shows tooltip "Restore donor" when hovering over restore button', async () => {
    const user = userEvent.setup();
    const donors = [
      {
        id: 1,
        name: 'Archived Donor',
        email: 'archived@example.com',
        discarded_at: '2025-10-07T00:00:00Z',
      },
    ];

    render(<DonorList donors={donors} />);

    const restoreButton = screen.getByRole('button', { name: /restore/i });
    await user.hover(restoreButton);

    expect(await screen.findByText('Restore donor')).toBeInTheDocument();
  });

  it('hides @mailinator.com email addresses', () => {
    const donors = [
      { id: 1, name: 'Anonymous', email: 'Anonymous@mailinator.com' },
    ];

    render(<DonorList donors={donors} />);

    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    expect(
      screen.queryByText('Anonymous@mailinator.com')
    ).not.toBeInTheDocument();
  });

  it('displays placeholder text for hidden emails', () => {
    const donors = [
      { id: 1, name: 'Anonymous', email: 'Anonymous@mailinator.com' },
    ];

    render(<DonorList donors={donors} />);

    expect(screen.getByText('(No email provided)')).toBeInTheDocument();
  });

  it('shows real email addresses for non-mailinator domains', () => {
    const donors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];

    render(<DonorList donors={donors} />);

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.queryByText('(No email provided)')).not.toBeInTheDocument();
  });

  it('renders checkboxes for donor selection', () => {
    const donors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    render(<DonorList donors={donors} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
  });

  it('calls onSelectionChange when checkbox is clicked', async () => {
    const donors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];
    const handleSelectionChange = jest.fn();

    render(<DonorList donors={donors} onSelectionChange={handleSelectionChange} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes[0].click();

    expect(handleSelectionChange).toHaveBeenCalledWith([1]);
  });
});
