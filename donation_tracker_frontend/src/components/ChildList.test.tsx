import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChildList from './ChildList';
import { Child } from '../types';

describe('ChildList', () => {
  const mockChildren: Child[] = [
    { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', can_be_deleted: true },
    { id: 2, name: 'Juan', created_at: '2025-01-02', updated_at: '2025-01-02', can_be_deleted: true }
  ];

  it('renders children as cards', () => {
    render(<ChildList children={mockChildren} onEdit={jest.fn()} onArchive={jest.fn()} />);

    const cards = screen.getAllByTestId('child-card');
    expect(cards).toHaveLength(2);
  });

  it('shows add sponsor icon for active children', () => {
    render(<ChildList children={mockChildren} onEdit={jest.fn()} onArchive={jest.fn()} onAddSponsor={jest.fn()} />);

    const addSponsorButtons = screen.getAllByRole('button', { name: /add sponsor/i });
    expect(addSponsorButtons).toHaveLength(2);
  });

  it('renders list of children', () => {
    render(<ChildList children={mockChildren} onEdit={jest.fn()} onArchive={jest.fn()} />);

    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText('Juan')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const mockEdit = jest.fn();
    const user = userEvent.setup();

    render(<ChildList children={mockChildren} onEdit={mockEdit} onArchive={jest.fn()} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    expect(mockEdit).toHaveBeenCalledWith(mockChildren[0]);
  });

  it('calls onArchive when archive button is clicked', async () => {
    const childrenCannotDelete: Child[] = [
      { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', can_be_deleted: false }
    ];
    const mockArchive = jest.fn();
    const user = userEvent.setup();

    render(<ChildList children={childrenCannotDelete} onEdit={jest.fn()} onArchive={mockArchive} onDelete={jest.fn()} />);

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    await user.click(archiveButton);

    expect(mockArchive).toHaveBeenCalledWith(childrenCannotDelete[0].id);
  });

  it('shows empty state message when no children', () => {
    render(<ChildList children={[]} onEdit={jest.fn()} onArchive={jest.fn()} />);

    expect(screen.getByText(/no children found/i)).toBeInTheDocument();
  });

  it('shows sponsor info when child has active sponsorship', () => {
    const mockSponsorships = new Map([[1, [{ id: 1, donor_id: 1, donor_name: 'John Doe', child_id: 1, child_name: 'Maria', monthly_amount: '50.0', active: true, end_date: null }]]]);

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onDelete={jest.fn()} sponsorships={mockSponsorships} onAddSponsor={jest.fn()} />);

    expect(screen.getByText(/sponsored by: john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/\$50\/mo/i)).toBeInTheDocument();
  });

  it('shows no active sponsor message when child has no sponsorships', () => {
    const mockSponsorships = new Map();

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onDelete={jest.fn()} sponsorships={mockSponsorships} onAddSponsor={jest.fn()} />);

    const noSponsorMessages = screen.getAllByText(/no active sponsor/i);
    expect(noSponsorMessages).toHaveLength(2); // Both children have no sponsor
  });

  it('calls onAddSponsor when Add Sponsor button clicked', async () => {
    const mockAddSponsor = jest.fn();
    const mockSponsorships = new Map();
    const user = userEvent.setup();

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onArchive={jest.fn()} sponsorships={mockSponsorships} onAddSponsor={mockAddSponsor} />);

    const addSponsorButtons = screen.getAllByRole('button', { name: /add sponsor/i });
    await user.click(addSponsorButtons[0]);

    expect(mockAddSponsor).toHaveBeenCalledWith(mockChildren[0]);
  });

  it('displays single active sponsor correctly', () => {
    const mockSponsorships = new Map([
      [1, [
        { id: 1, donor_id: 1, donor_name: 'John Doe', child_id: 1, child_name: 'Maria', monthly_amount: '50.0', active: true, end_date: null }
      ]]
    ]);

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onArchive={jest.fn()} sponsorships={mockSponsorships} />);

    expect(screen.getByText(/sponsored by: john doe \(\$50\/mo\)/i)).toBeInTheDocument();
  });

  it('displays multiple active sponsors comma-separated', () => {
    const mockSponsorships = new Map([
      [1, [
        { id: 1, donor_id: 1, donor_name: 'John Doe', child_id: 1, child_name: 'Maria', monthly_amount: '50.0', active: true, end_date: null },
        { id: 2, donor_id: 2, donor_name: 'Jane Smith', child_id: 1, child_name: 'Maria', monthly_amount: '75.0', active: true, end_date: null },
        { id: 3, donor_id: 3, donor_name: 'Bob Johnson', child_id: 1, child_name: 'Maria', monthly_amount: '100.0', active: true, end_date: null }
      ]]
    ]);

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onArchive={jest.fn()} sponsorships={mockSponsorships} />);

    expect(screen.getByText(/sponsored by: john doe \(\$50\/mo\), jane smith \(\$75\/mo\), bob johnson \(\$100\/mo\)/i)).toBeInTheDocument();
  });

  it('shows "No active sponsors" when all sponsorships have ended', () => {
    const mockSponsorships = new Map([
      [1, [
        { id: 1, donor_id: 1, donor_name: 'John Doe', child_id: 1, child_name: 'Maria', monthly_amount: '50.0', active: false, end_date: '2024-12-31' },
        { id: 2, donor_id: 2, donor_name: 'Jane Smith', child_id: 1, child_name: 'Maria', monthly_amount: '75.0', active: false, end_date: '2024-11-30' }
      ]]
    ]);

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onArchive={jest.fn()} sponsorships={mockSponsorships} />);

    const noSponsorMessages = screen.getAllByText(/no active sponsors/i);
    expect(noSponsorMessages).toHaveLength(2); // Both children have no active sponsors
  });

  it('shows "No active sponsors" when no sponsorships exist', () => {
    const mockSponsorships = new Map();

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onArchive={jest.fn()} sponsorships={mockSponsorships} />);

    const noSponsorMessages = screen.getAllByText(/no active sponsors/i);
    expect(noSponsorMessages).toHaveLength(2); // Both children have no sponsors
  });

  it('shows delete button when can_be_deleted is true', () => {
    const childCanDelete: Child[] = [
      { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', can_be_deleted: true }
    ];

    render(<ChildList children={childCanDelete} onEdit={jest.fn()} onDelete={jest.fn()} onArchive={jest.fn()} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('shows archive button when can_be_deleted is false', () => {
    const childCannotDelete: Child[] = [
      { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01', can_be_deleted: false }
    ];

    render(<ChildList children={childCannotDelete} onEdit={jest.fn()} onDelete={jest.fn()} onArchive={jest.fn()} />);

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    expect(archiveButton).toBeInTheDocument();
  });
});
