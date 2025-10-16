const mockApiClient = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

export const mergeDonors = jest.fn();
export const createDonation = jest.fn();

export default mockApiClient;
