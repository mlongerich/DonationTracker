// Example Pact Consumer Test for User API
import {
  setupProvider,
  finalizeProvider,
  verifyProvider,
  provider,
} from './setup';
import { apiClient } from '../../api/client';

describe('User API Contract Tests', () => {
  // Setup and teardown
  beforeAll(async () => {
    await setupProvider();
  });

  afterAll(async () => {
    await finalizeProvider();
  });

  afterEach(async () => {
    await verifyProvider();
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID when user exists', async () => {
      // Define the expected interaction using Pact v12 API
      await provider.addInteraction({
        state: 'user 123 exists',
        uponReceiving: 'a request for user 123',
        withRequest: {
          method: 'GET',
          path: '/api/users/123',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            id: 123,
            username: 'testuser',
          },
        },
      });

      // Make the actual request
      const response = await apiClient.get('/users/123');

      // Verify the response matches expectations
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(123);
      expect(response.data.username).toBe('testuser');
    });

    it('should return 404 when user does not exist', async () => {
      await provider.addInteraction({
        state: 'no users exist',
        uponReceiving: 'a request for non-existent user',
        withRequest: {
          method: 'GET',
          path: '/api/users/999',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            error: 'User not found',
          },
        },
      });

      await expect(apiClient.get('/users/999')).rejects.toMatchObject({
        response: {
          status: 404,
          data: { error: 'User not found' },
        },
      });
    });
  });

  describe('POST /api/users', () => {
    it('should create a user with valid attributes', async () => {
      const newUser = {
        username: 'newuser',
      };

      await provider.addInteraction({
        state: 'no users exist',
        uponReceiving: 'a request to create a user',
        withRequest: {
          method: 'POST',
          path: '/api/users',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: { user: newUser },
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            id: 1,
            username: 'newuser',
          },
        },
      });

      const response = await apiClient.post('/users', { user: newUser });

      expect(response.status).toBe(201);
      expect(response.data.username).toBe('newuser');
    });
  });
});
