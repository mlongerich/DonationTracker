import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChildList from './ChildList';
import { Child } from '../types';

describe('ChildList', () => {
  const mockChildren: Child[] = [
    { id: 1, name: 'Maria', created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 2, name: 'Juan', created_at: '2025-01-02', updated_at: '2025-01-02' }
  ];

  it('renders list of children', () => {
    render(<ChildList children={mockChildren} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText('Juan')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const mockEdit = jest.fn();
    const user = userEvent.setup();

    render(<ChildList children={mockChildren} onEdit={mockEdit} onDelete={jest.fn()} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    expect(mockEdit).toHaveBeenCalledWith(mockChildren[0]);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const mockDelete = jest.fn();
    const user = userEvent.setup();

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onDelete={mockDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(mockDelete).toHaveBeenCalledWith(mockChildren[0].id);
  });

  it('shows empty state message when no children', () => {
    render(<ChildList children={[]} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText(/no children found/i)).toBeInTheDocument();
  });

  it('shows sponsor info when child has active sponsorship', () => {
    const mockSponsorships = new Map([[1, [{ id: 1, donor_id: 1, donor_name: 'John Doe', child_id: 1, child_name: 'Maria', monthly_amount: '50.0', active: true, end_date: null }]]]);

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onDelete={jest.fn()} sponsorships={mockSponsorships} onAddSponsor={jest.fn()} />);

    expect(screen.getByText(/sponsored by john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/\$50/i)).toBeInTheDocument();
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

    render(<ChildList children={mockChildren} onEdit={jest.fn()} onDelete={jest.fn()} sponsorships={mockSponsorships} onAddSponsor={mockAddSponsor} />);

    const addSponsorButtons = screen.getAllByRole('button', { name: /add sponsor/i });
    await user.click(addSponsorButtons[0]);

    expect(mockAddSponsor).toHaveBeenCalledWith(mockChildren[0]);
  });
});
