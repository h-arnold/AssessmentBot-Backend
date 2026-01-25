module.exports = {
  collectCoverageFrom: ['src/**/*.{js,ts}'],
  coverageDirectory: '<rootDir>/coverage',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testRegex: '.+\\.e2e-spec\\.ts$',
  setupFiles: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/test/jest.e2e.mocked.setup.ts',
  ],
  detectOpenHandles: true,
  testTimeout: 30000,
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testPathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/test/.*-live\\.e2e-spec\\.ts$',
  ],
  watchPathIgnorePatterns: ['<rootDir>/dist/'],
};
