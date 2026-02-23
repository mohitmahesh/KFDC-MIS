/**
 * Jest Setup
 * Global test setup and custom matchers
 */
import '@testing-library/jest-dom'

// Mock environment variables
process.env.MONGO_URL = 'mongodb://localhost:27017'
process.env.DB_NAME = 'kfdc_test'
process.env.CORS_ORIGINS = '*'

// Global test timeout
jest.setTimeout(30000)

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: jest.fn(),
}
