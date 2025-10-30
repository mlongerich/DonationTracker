import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectOrChildAutocomplete from './ProjectOrChildAutocomplete';

import { searchProjectOrChild } from '../api/client';

jest.mock('../api/client', () => ({
  searchProjectOrChild: jest.fn(),
}));

describe('ProjectOrChildAutocomplete', () => {
  beforeEach(() => {
    (searchProjectOrChild as jest.Mock).mockClear();
  });
  it('renders search field', () => {
    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    expect(searchField).toBeInTheDocument();
  });

  it('debounces search input (300ms)', async () => {
    const user = userEvent.setup();
    const mockData = { projects: [], children: [] };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 't');
    await user.type(searchField, 'e');
    await user.type(searchField, 's');
    await user.type(searchField, 't');

    // Should not call API immediately
    expect(searchProjectOrChild).not.toHaveBeenCalled();

    // Should call API after 300ms debounce
    await waitFor(() => expect(searchProjectOrChild).toHaveBeenCalledWith('test'), {
      timeout: 400,
    });
  });

  it('fetches projects when typing', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [
        { id: 1, title: 'Project Alpha', project_type: 'general' },
        { id: 2, title: 'Project Beta', project_type: 'general' },
      ],
      children: []
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'project');

    await waitFor(() => expect(searchProjectOrChild).toHaveBeenCalledWith('project'), {
      timeout: 400,
    });
  });

  it('fetches children when typing', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [],
      children: [
        { id: 1, name: 'Maria Santos' },
        { id: 2, name: 'Juan Rodriguez' },
      ]
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'maria');

    await waitFor(() => expect(searchProjectOrChild).toHaveBeenCalledWith('maria'), {
      timeout: 400,
    });
  });
});
