import { render, screen, waitFor } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import userEvent from '@testing-library/user-event';
import ReportsPage from './ReportsPage';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('ReportsPage', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {component}
      </LocalizationProvider>
    );
  };

  it('renders title and description', () => {
    renderWithProvider(<ReportsPage />);

    expect(screen.getByText('Donation Reports')).toBeInTheDocument();
    expect(screen.getByText(/generate a detailed report/i)).toBeInTheDocument();
  });

  it('renders Start Date picker with default value of Jan 1 current year', () => {
    renderWithProvider(<ReportsPage />);

    const currentYear = new Date().getFullYear();
    // MUI DatePicker renders the date value in a hidden input
    const startDateInput = screen.getByDisplayValue(`01/01/${currentYear}`);
    expect(startDateInput).toBeInTheDocument();
  });

  it('renders End Date picker with default value of today', () => {
    renderWithProvider(<ReportsPage />);

    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();

    const endDateInput = screen.getByDisplayValue(`${month}/${day}/${year}`);
    expect(endDateInput).toBeInTheDocument();
  });

  it('renders generate report button', () => {
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).toBeEnabled();
  });

  it('displays loading state when generate button is clicked', async () => {
    jest.spyOn(apiClient, 'get').mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              data: {
                donations: [],
                donor_summary: [],
                project_summary: [],
                meta: { start_date: '2025-01-01', end_date: '2025-12-31', total_count: 0, total_amount: '$0.00' },
              },
            }),
          100
        )
      )
    );

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    user.click(generateButton);

    // Button should show loading text (wait for it to appear)
    const loadingButton = await screen.findByRole('button', { name: /generating report/i });
    expect(loadingButton).toBeInTheDocument();
  });

  it('displays error message in Snackbar when generate fails', async () => {
    jest.spyOn(apiClient, 'get').mockRejectedValue({
      response: { data: { error: 'start_date must be before or equal to end_date' } },
    });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Error message should appear in Snackbar
    const errorAlert = await screen.findByText(/start_date must be before or equal to end_date/i);
    expect(errorAlert).toBeInTheDocument();
  });

  it('fetches and displays report data when Generate Report button is clicked', async () => {
    const mockData = {
      donations: [
        {
          date: '12 March 2025',
          donor_name: 'John Doe',
          amount: '$100.00',
          project_or_child: 'General Fund',
          payment_method: 'stripe',
          all_time_total: '$1000.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'John Doe',
          period_total: '$100.00',
          all_time_total: '$1000.00'
        }
      ],
      project_summary: [
        {
          project_id: 1,
          project_name: 'General Fund',
          period_total: '$100.00',
          all_time_total: '$500.00'
        }
      ],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 1,
        total_amount: '$100.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Section 1: Donations table should display
    expect(await screen.findByText('12 March 2025')).toBeInTheDocument();
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('General Fund').length).toBeGreaterThan(0);
    expect(screen.getByText('stripe')).toBeInTheDocument();

    // Should show total amount
    expect(screen.getByText('Total:')).toBeInTheDocument();
    const amounts = screen.getAllByText('$100.00');
    expect(amounts.length).toBeGreaterThan(0);
  });

  it('displays donor summary section with period and all-time totals', async () => {
    const mockData = {
      donations: [
        {
          date: '12 March 2025',
          donor_name: 'Jane Smith',
          amount: '$50.00',
          project_or_child: 'General Fund',
          payment_method: 'check',
          all_time_total: '$500.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'Jane Smith',
          period_total: '$50.00',
          all_time_total: '$500.00'
        }
      ],
      project_summary: [],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 1,
        total_amount: '$50.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Section 2: Donor Summary should display
    expect(await screen.findByText('Donor Summary')).toBeInTheDocument();
    const janeSmithElements = screen.getAllByText('Jane Smith');
    expect(janeSmithElements.length).toBeGreaterThanOrEqual(2); // In both Donations and Donor Summary
    expect(screen.getAllByText('$50.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$500.00').length).toBeGreaterThan(0);
  });

  it('displays project summary section with period and all-time totals', async () => {
    const mockData = {
      donations: [
        {
          date: '5 April 2025',
          donor_name: 'Bob Johnson',
          amount: '$75.00',
          project_or_child: 'Campaign ABC',
          payment_method: 'cash',
          all_time_total: '$200.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'Bob Johnson',
          period_total: '$75.00',
          all_time_total: '$200.00'
        }
      ],
      project_summary: [
        {
          project_id: 1,
          project_name: 'Campaign ABC',
          period_total: '$75.00',
          all_time_total: '$300.00'
        }
      ],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 1,
        total_amount: '$75.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Section 3: Project Summary should display
    expect(await screen.findByText('Project Summary')).toBeInTheDocument();
    expect(screen.getAllByText('Campaign ABC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$75.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$300.00').length).toBeGreaterThan(0);
  });

  it('donor summary rows are collapsed by default', async () => {
    const mockData = {
      donations: [
        {
          date: '10 January 2025',
          donor_name: 'Alice Cooper',
          amount: '$25.00',
          project_or_child: 'General Fund',
          payment_method: 'stripe',
          all_time_total: '$100.00',
          project_id: 1
        },
        {
          date: '15 February 2025',
          donor_name: 'Alice Cooper',
          amount: '$30.00',
          project_or_child: 'Campaign XYZ',
          payment_method: 'check',
          all_time_total: '$100.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'Alice Cooper',
          period_total: '$55.00',
          all_time_total: '$100.00'
        }
      ],
      project_summary: [],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 2,
        total_amount: '$55.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Wait for Donor Summary to appear
    await screen.findByText('Donor Summary');

    // Expand icon should be visible but donations should only appear once (in Section 1, not expanded)
    const expandIcons = screen.getAllByTestId('ExpandMoreIcon');
    expect(expandIcons.length).toBeGreaterThan(0);

    // Dates appear in Section 1 (Donations), but not duplicated in expanded donor details
    const januaryDates = screen.getAllByText('10 January 2025');
    expect(januaryDates.length).toBe(1); // Only in Section 1, not in expanded donor row
  });

  it('expands donor row when clicked to show donations', async () => {
    const mockData = {
      donations: [
        {
          date: '10 January 2025',
          donor_name: 'Alice Cooper',
          amount: '$25.00',
          project_or_child: 'General Fund',
          payment_method: 'stripe',
          all_time_total: '$100.00',
          project_id: 1
        },
        {
          date: '15 February 2025',
          donor_name: 'Alice Cooper',
          amount: '$30.00',
          project_or_child: 'Campaign XYZ',
          payment_method: 'check',
          all_time_total: '$100.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'Alice Cooper',
          period_total: '$55.00',
          all_time_total: '$100.00'
        }
      ],
      project_summary: [],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 2,
        total_amount: '$55.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Wait for Donor Summary to appear
    await screen.findByText('Donor Summary');

    // Initially, dates appear only once (in Section 1)
    expect(screen.getAllByText('10 January 2025').length).toBe(1);
    expect(screen.getAllByText('15 February 2025').length).toBe(1);

    // Click on donor name in Donor Summary section to expand the row
    // Alice Cooper appears multiple times: twice in Section 1 (2 donations), once in Section 2 (Donor Summary)
    const aliceCooperElements = screen.getAllByText('Alice Cooper');
    // The last occurrence is in Section 2 (Donor Summary)
    await user.click(aliceCooperElements[aliceCooperElements.length - 1]);

    // After expanding, dates should appear twice (Section 1 + expanded donor detail)
    await waitFor(() => {
      expect(screen.getAllByText('10 January 2025').length).toBe(2);
    });

    expect(screen.getAllByText('15 February 2025').length).toBe(2);
    expect(screen.getAllByText('Campaign XYZ').length).toBeGreaterThan(0);
  });

  it('allows multiple donor rows to be expanded simultaneously', async () => {
    const mockData = {
      donations: [
        {
          date: '10 January 2025',
          donor_name: 'Alice Cooper',
          amount: '$25.00',
          project_or_child: 'General Fund',
          payment_method: 'stripe',
          all_time_total: '$100.00',
          project_id: 1
        },
        {
          date: '15 February 2025',
          donor_name: 'Bob Smith',
          amount: '$50.00',
          project_or_child: 'Campaign XYZ',
          payment_method: 'check',
          all_time_total: '$200.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'Alice Cooper',
          period_total: '$25.00',
          all_time_total: '$100.00'
        },
        {
          donor_name: 'Bob Smith',
          period_total: '$50.00',
          all_time_total: '$200.00'
        }
      ],
      project_summary: [],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 2,
        total_amount: '$75.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    await screen.findByText('Donor Summary');

    // Initially, dates appear only once (in Section 1)
    expect(screen.getAllByText('10 January 2025').length).toBe(1);
    expect(screen.getAllByText('15 February 2025').length).toBe(1);

    // Expand first donor (Alice Cooper)
    const aliceCooperElements = screen.getAllByText('Alice Cooper');
    // Alice appears once in Section 1, once in Section 2 - click the last one (Donor Summary)
    await user.click(aliceCooperElements[aliceCooperElements.length - 1]);

    // Verify Alice's donation appears in expanded section
    await waitFor(() => {
      expect(screen.getAllByText('10 January 2025').length).toBe(2);
    });

    // Bob's date should still appear only once (not expanded yet)
    expect(screen.getAllByText('15 February 2025').length).toBe(1);

    // Expand second donor (Bob Smith) while first is still expanded
    const bobSmithElements = screen.getAllByText('Bob Smith');
    // Bob appears once in Section 1, once in Section 2 - click the last one (Donor Summary)
    await user.click(bobSmithElements[bobSmithElements.length - 1]);

    // Verify both donors' donations are visible in expanded sections
    await waitFor(() => {
      expect(screen.getAllByText('15 February 2025').length).toBe(2);
    });

    // Alice's date should still be visible twice (both expanded)
    expect(screen.getAllByText('10 January 2025').length).toBe(2);
  });

  it('project summary rows are collapsed by default', async () => {
    const mockData = {
      donations: [
        {
          date: '5 March 2025',
          donor_name: 'Charlie Brown',
          amount: '$40.00',
          project_or_child: 'General Fund',
          payment_method: 'stripe',
          all_time_total: '$150.00',
          project_id: 1
        },
        {
          date: '12 March 2025',
          donor_name: 'Charlie Brown',
          amount: '$60.00',
          project_or_child: 'General Fund',
          payment_method: 'check',
          all_time_total: '$150.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'Charlie Brown',
          period_total: '$100.00',
          all_time_total: '$150.00'
        }
      ],
      project_summary: [
        {
          project_id: 1,
          project_name: 'General Fund',
          period_total: '$100.00',
          all_time_total: '$500.00'
        }
      ],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 2,
        total_amount: '$100.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Wait for Project Summary to appear
    await screen.findByText('Project Summary');

    // Dates appear in Section 1 (Donations), but not duplicated in expanded project details
    const marchDates = screen.getAllByText('5 March 2025');
    expect(marchDates.length).toBe(1); // Only in Section 1, not in expanded project row
  });

  it('expands project row when clicked to show donations', async () => {
    const mockData = {
      donations: [
        {
          date: '5 March 2025',
          donor_name: 'Charlie Brown',
          amount: '$40.00',
          project_or_child: 'General Fund',
          payment_method: 'stripe',
          all_time_total: '$150.00',
          project_id: 1
        },
        {
          date: '12 March 2025',
          donor_name: 'Charlie Brown',
          amount: '$60.00',
          project_or_child: 'General Fund',
          payment_method: 'check',
          all_time_total: '$150.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'Charlie Brown',
          period_total: '$100.00',
          all_time_total: '$150.00'
        }
      ],
      project_summary: [
        {
          project_id: 1,
          project_name: 'General Fund',
          period_total: '$100.00',
          all_time_total: '$500.00'
        }
      ],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 2,
        total_amount: '$100.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    await screen.findByText('Project Summary');

    // Initially, dates appear only once (in Section 1)
    expect(screen.getAllByText('5 March 2025').length).toBe(1);
    expect(screen.getAllByText('12 March 2025').length).toBe(1);

    // Click on project name in Project Summary section to expand the row
    // General Fund appears multiple times: twice in Section 1 (2 donations), once in Section 3 (Project Summary)
    const generalFundElements = screen.getAllByText('General Fund');
    // The last occurrence is in Section 3 (Project Summary)
    await user.click(generalFundElements[generalFundElements.length - 1]);

    // After expanding, dates should appear twice (Section 1 + expanded project detail)
    await waitFor(() => {
      expect(screen.getAllByText('5 March 2025').length).toBe(2);
    });

    expect(screen.getAllByText('12 March 2025').length).toBe(2);
    expect(screen.getAllByText('Charlie Brown').length).toBeGreaterThan(0);
  });

  it('allows multiple project rows to be expanded simultaneously', async () => {
    const mockData = {
      donations: [
        {
          date: '5 March 2025',
          donor_name: 'Charlie Brown',
          amount: '$40.00',
          project_or_child: 'General Fund',
          payment_method: 'stripe',
          all_time_total: '$150.00',
          project_id: 1
        },
        {
          date: '12 March 2025',
          donor_name: 'Diana Prince',
          amount: '$60.00',
          project_or_child: 'Campaign ABC',
          payment_method: 'check',
          all_time_total: '$200.00',
          project_id: 2
        }
      ],
      donor_summary: [
        {
          donor_name: 'Charlie Brown',
          period_total: '$40.00',
          all_time_total: '$150.00'
        },
        {
          donor_name: 'Diana Prince',
          period_total: '$60.00',
          all_time_total: '$200.00'
        }
      ],
      project_summary: [
        {
          project_id: 1,
          project_name: 'General Fund',
          period_total: '$40.00',
          all_time_total: '$300.00'
        },
        {
          project_id: 2,
          project_name: 'Campaign ABC',
          period_total: '$60.00',
          all_time_total: '$400.00'
        }
      ],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 2,
        total_amount: '$100.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    await screen.findByText('Project Summary');

    // Initially, dates appear only once (in Section 1)
    expect(screen.getAllByText('5 March 2025').length).toBe(1);
    expect(screen.getAllByText('12 March 2025').length).toBe(1);

    // Expand first project (General Fund)
    const generalFundElements = screen.getAllByText('General Fund');
    // General Fund appears once in Section 1, once in Section 3 - click the last one (Project Summary)
    await user.click(generalFundElements[generalFundElements.length - 1]);

    // Verify General Fund donation appears in expanded section
    await waitFor(() => {
      expect(screen.getAllByText('5 March 2025').length).toBe(2);
    });

    // Campaign ABC date should still appear only once (not expanded yet)
    expect(screen.getAllByText('12 March 2025').length).toBe(1);

    // Expand second project (Campaign ABC) while first is still expanded
    const campaignAbcElements = screen.getAllByText('Campaign ABC');
    // Campaign ABC appears once in Section 1, once in Section 3 - click the last one (Project Summary)
    await user.click(campaignAbcElements[campaignAbcElements.length - 1]);

    // Verify both projects' donations are visible in expanded sections
    await waitFor(() => {
      expect(screen.getAllByText('12 March 2025').length).toBe(2);
    });

    // General Fund date should still be visible twice (both expanded)
    expect(screen.getAllByText('5 March 2025').length).toBe(2);
  });

  it('expands project row for child sponsorship to show child donations (bug fix)', async () => {
    const mockData = {
      donations: [
        {
          date: '10 February 2025',
          donor_name: 'Jane Smith',
          amount: '$50.00',
          project_or_child: 'Sangwan', // Child name
          payment_method: 'stripe',
          all_time_total: '$150.00',
          project_id: 1 // Child Sponsorship project ID
        }
      ],
      donor_summary: [
        {
          donor_name: 'Jane Smith',
          period_total: '$50.00',
          all_time_total: '$150.00'
        }
      ],
      project_summary: [
        {
          project_id: 1,
          project_name: 'Child Sponsorship', // Project title (different from child name!)
          period_total: '$50.00',
          all_time_total: '$200.00'
        }
      ],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 1,
        total_amount: '$50.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    await screen.findByText('Project Summary');

    // "Sangwan" appears once in Section 1 (Project/Child column)
    expect(screen.getAllByText('Sangwan').length).toBe(1);

    // Count Jane Smith appearances before expansion
    // Section 1 (Donations): 1, Section 2 (Donor Summary): 1
    const initialJaneSmithCount = screen.getAllByText('Jane Smith').length;
    expect(initialJaneSmithCount).toBe(2);

    // Click on "Child Sponsorship" project row to expand
    const childSponsorshipElements = screen.getAllByText('Child Sponsorship');
    await user.click(childSponsorshipElements[childSponsorshipElements.length - 1]);

    // After expanding, Jane Smith should appear one more time in the expanded detail
    // This tests the bug fix: filter by project_id (not name) correctly matches child donations
    await waitFor(() => {
      expect(screen.getAllByText('Jane Smith').length).toBe(initialJaneSmithCount + 1);
    });

    // Sangwan still appears only once (it's not shown in Project Summary expansion)
    expect(screen.getAllByText('Sangwan').length).toBe(1);
  });

  it('shows download CSV button after report data is generated', async () => {
    const mockData = {
      donations: [
        {
          date: '15 June 2025',
          donor_name: 'John Doe',
          amount: '$100.00',
          project_or_child: 'General Fund',
          payment_method: 'stripe',
          all_time_total: '$1000.00',
          project_id: 1
        }
      ],
      donor_summary: [
        {
          donor_name: 'John Doe',
          period_total: '$100.00',
          all_time_total: '$1000.00'
        }
      ],
      project_summary: [
        {
          project_id: 1,
          project_name: 'General Fund',
          period_total: '$100.00',
          all_time_total: '$500.00'
        }
      ],
      meta: {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        total_count: 1,
        total_amount: '$100.00'
      }
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: mockData });

    const user = userEvent.setup();
    renderWithProvider(<ReportsPage />);

    // Download button should not be visible initially
    expect(screen.queryByRole('button', { name: /download csv report/i })).not.toBeInTheDocument();

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Download button should appear after data is loaded
    expect(await screen.findByRole('button', { name: /download csv report/i })).toBeInTheDocument();
  });
});
