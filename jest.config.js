/**
 * Safe CA - Jest Configuration
 */

export default {
  testEnvironment: 'jsdom',
  
  // Handle ES modules
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'mjs', 'json'],
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.mjs'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/utils/**/*.js',
    '!src/background/service-worker.js',
    '!src/content/content.js'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Verbose output
  verbose: true,
  
  // Timeout
  testTimeout: 10000,
  
  // Mock chrome API globally
  globals: {
    chrome: {}
  }
};
