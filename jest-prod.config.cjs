module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/test/prod-tests'],
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testRegex: '.+\\.prod-spec\\.ts$',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
    '^prod-tests/(.*)$': '<rootDir>/test/prod-tests/$1',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  detectOpenHandles: true,
  testTimeout: 600000,
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  watchPathIgnorePatterns: ['<rootDir>/dist/'],
};
