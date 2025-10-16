import { mergeDonors } from './client';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('mergeDonors', () => {
  it('sends POST request to /api/donors/merge with correct payload', async () => {
    const mockMergedDonor = {
      id: 3,
      name: 'Alice Smith',
      email: 'alice.smith@example.com',
    };

    server.use(
      http.post('http://localhost:3001/api/donors/merge', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({
          donor_ids: [1, 2],
          field_selections: { name: 1, email: 2 },
        });
        return HttpResponse.json(mockMergedDonor);
      })
    );

    const result = await mergeDonors([1, 2], { name: 1, email: 2 });

    expect(result).toEqual(mockMergedDonor);
  });
});
