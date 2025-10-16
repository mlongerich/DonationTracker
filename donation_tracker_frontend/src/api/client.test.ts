// Mock axios first to avoid ESM issues
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() }
      }
    }))
  }
}));

// Now we can import and use the actual client module
import apiClient from './client';
const actualModule = jest.requireActual<typeof import('./client')>('./client');
const { mergeDonors } = actualModule;

describe('mergeDonors', () => {
  it('calls apiClient.post with correct endpoint and payload', async () => {
    const mockMergedDonor = {
      id: 3,
      name: 'Alice Smith',
      email: 'alice.smith@example.com',
    };

    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockMergedDonor });

    const result = await mergeDonors([1, 2], { name: 1, email: 2 });

    expect(apiClient.post).toHaveBeenCalledWith('/api/donors/merge', {
      donor_ids: [1, 2],
      field_selections: { name: 1, email: 2 },
    });
    expect(result).toEqual(mockMergedDonor);
  });
});
