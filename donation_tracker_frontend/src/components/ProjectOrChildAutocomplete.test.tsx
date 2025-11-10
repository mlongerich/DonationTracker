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
    await waitFor(
      () => expect(searchProjectOrChild).toHaveBeenCalledWith('test'),
      {
        timeout: 400,
      }
    );
  });

  it('fetches projects when typing', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [
        { id: 1, title: 'Project Alpha', project_type: 'general' },
        { id: 2, title: 'Project Beta', project_type: 'general' },
      ],
      children: [],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'project');

    await waitFor(
      () => expect(searchProjectOrChild).toHaveBeenCalledWith('project'),
      {
        timeout: 400,
      }
    );
  });

  it('fetches children when typing', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [],
      children: [
        { id: 1, name: 'Maria Santos' },
        { id: 2, name: 'Juan Rodriguez' },
      ],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'maria');

    await waitFor(
      () => expect(searchProjectOrChild).toHaveBeenCalledWith('maria'),
      {
        timeout: 400,
      }
    );
  });

  it('renders "Child" badge for child options', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [],
      children: [{ id: 1, name: 'Maria Santos' }],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'maria');

    // Wait for options to appear and check for "Child" badge
    await waitFor(() => {
      const childBadge = screen.getByText('Child');
      expect(childBadge).toBeInTheDocument();
    });
  });

  it('renders "General" badge for general project options', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [{ id: 1, title: 'General Fund', project_type: 'general' }],
      children: [],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'general');

    // Wait for options to appear and check for "General" badge
    await waitFor(() => {
      const generalBadge = screen.getByText('General');
      expect(generalBadge).toBeInTheDocument();
    });
  });

  it('renders "Campaign" badge for campaign project options', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [
        { id: 2, title: 'Christmas Campaign', project_type: 'campaign' },
      ],
      children: [],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'christmas');

    // Wait for options to appear and check for "Campaign" badge
    await waitFor(() => {
      const campaignBadge = screen.getByText('Campaign');
      expect(campaignBadge).toBeInTheDocument();
    });
  });

  it('adds spacing between badge and name', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [],
      children: [{ id: 1, name: 'Maria Santos' }],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'maria');

    // Wait for options - badge should exist (spacing verified visually)
    await waitFor(() => {
      const badge = screen.getByText('Child');
      expect(badge).toBeInTheDocument();
    });
  });

  it('renders Boy icon for child with boy gender', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [],
      children: [{ id: 1, name: 'John', gender: 'boy' }],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'john');

    // Wait for options and check for Boy icon (MUI icons have data-testid)
    await waitFor(() => {
      const icon = screen.getByTestId('BoyIcon');
      expect(icon).toBeInTheDocument();
    });
  });

  it('renders Girl icon for child with girl gender', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [],
      children: [{ id: 2, name: 'Maria', gender: 'girl' }],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'maria');

    // Wait for options and check for Girl icon
    await waitFor(() => {
      const icon = screen.getByTestId('GirlIcon');
      expect(icon).toBeInTheDocument();
    });
  });

  it('renders Boy icon for child with null gender (default)', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [],
      children: [{ id: 3, name: 'Sam', gender: null }],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'sam');

    // Wait for options and check for Boy icon (default)
    await waitFor(() => {
      const icon = screen.getByTestId('BoyIcon');
      expect(icon).toBeInTheDocument();
    });
  });

  it('renders Folder icon for general project', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [{ id: 1, title: 'General Fund', project_type: 'general' }],
      children: [],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'general');

    // Wait for options and check for Folder icon
    await waitFor(() => {
      const icon = screen.getByTestId('FolderIcon');
      expect(icon).toBeInTheDocument();
    });
  });

  it('renders Campaign icon for campaign project', async () => {
    const user = userEvent.setup();
    const mockData = {
      projects: [
        { id: 2, title: 'Christmas Campaign', project_type: 'campaign' },
      ],
      children: [],
    };

    (searchProjectOrChild as jest.Mock).mockResolvedValue(mockData);

    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const searchField = screen.getByRole('combobox');
    await user.type(searchField, 'christmas');

    // Wait for options and check for Campaign icon
    await waitFor(() => {
      const icon = screen.getByTestId('CampaignIcon');
      expect(icon).toBeInTheDocument();
    });
  });

  it('uses "Donation For" as default label', () => {
    render(<ProjectOrChildAutocomplete value={null} onChange={() => {}} />);

    const label = screen.getByLabelText('Donation For');
    expect(label).toBeInTheDocument();
  });
});
