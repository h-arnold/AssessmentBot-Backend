module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../src/$1',
  },
  testRegex: '.+\.e2e-spec\.ts$',
  setupFiles: ['<rootDir>/../jest.setup.ts'],
  detectOpenHandles: true,
  testTimeout: 30000,
  silent: false,
  verbose: true,
};