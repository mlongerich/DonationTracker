// Pact Consumer Setup for React Frontend
import { Pact } from '@pact-foundation/pact';
import path from 'path';

// Configure Pact consumer
export const provider = new Pact({
  consumer: 'Frontend Consumer',
  provider: 'Rails API',
  port: 1234, // Mock provider port
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  spec: 2,
  logLevel: 'info',
});

// Helper to start provider before tests
export const setupProvider = async (): Promise<void> => {
  try {
    await provider.setup();
    console.log('Pact provider setup complete');
  } catch (error) {
    console.error('Pact provider setup failed:', error);
    throw error;
  }
};

// Helper to finalize provider after tests
export const finalizeProvider = async (): Promise<void> => {
  try {
    await provider.finalize();
    console.log('Pact provider finalized');
  } catch (error) {
    console.error('Pact provider finalization failed:', error);
    throw error;
  }
};

// Helper to verify interactions
export const verifyProvider = async (): Promise<void> => {
  try {
    await provider.verify();
    console.log('Pact interactions verified');
  } catch (error) {
    console.error('Pact verification failed:', error);
    throw error;
  }
};
