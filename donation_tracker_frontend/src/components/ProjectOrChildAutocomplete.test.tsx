import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectOrChildAutocomplete from './ProjectOrChildAutocomplete';

import { fetchProjects, fetchChildren } from '../api/client';

jest.mock('../api/client', () => ({
  fetchProjects: jest.fn(),
  fetchChildren: jest.fn(),
}));

describe('ProjectOrChildAutocomplete', () => {
  beforeEach(() => {
    (fetchProjects as jest.Mock).mockClear().mockResolvedValue([]);
    (fetchChildren as jest.Mock).mockClear().mockResolvedValue([]);
  });
  it('renders search field', () => {
    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    expect(searchField).toBeInTheDocument();
  });

  it('shows loading spinner when typing', async () => {
    const user = userEvent.setup();

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'test');

    const loadingIndicator = screen.getByText('Loading…');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('debounces search input (300ms)', async () => {
    const user = userEvent.setup();

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 't');
    await user.type(searchField, 'e');
    await user.type(searchField, 's');
    await user.type(searchField, 't');

    // Should not call API immediately
    expect(fetchProjects).not.toHaveBeenCalled();

    // Should call API after 300ms debounce
    await waitFor(() => expect(fetchProjects).toHaveBeenCalledWith('test'), {
      timeout: 400,
    });
  });

  it('fetches projects when typing', async () => {
    const user = userEvent.setup();
    const mockProjects = [
      { id: 1, title: 'Project Alpha', project_type: 'general' },
      { id: 2, title: 'Project Beta', project_type: 'general' },
    ];

    (fetchProjects as jest.Mock).mockResolvedValue(mockProjects);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'project');

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledWith('project'), {
      timeout: 400,
    });
  });

  it('fetches children when typing', async () => {
    const user = userEvent.setup();
    const mockChildren = [
      { id: 1, name: 'Maria Santos' },
      { id: 2, name: 'Juan Rodriguez' },
    ];

    (fetchChildren as jest.Mock).mockResolvedValue(mockChildren);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'maria');

    await waitFor(() => expect(fetchChildren).toHaveBeenCalledWith('maria'), {
      timeout: 400,
    });
  });

  it('displays grouped results (Projects/Children)', async () => {
    const user = userEvent.setup();
    const mockProjects = [
      { id: 1, title: 'Project Alpha', project_type: 'general' },
    ];
    const mockChildren = [{ id: 10, name: 'Maria Santos' }];

    (fetchProjects as jest.Mock).mockResolvedValue(mockProjects);
    (fetchChildren as jest.Mock).mockResolvedValue(mockChildren);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'test');

    // Wait for results to load
    await waitFor(() => expect(screen.getByText('Projects')).toBeInTheDocument(), {
      timeout: 500,
    });
    expect(screen.getByText('Children')).toBeInTheDocument();
  });
});
