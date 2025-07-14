module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'test',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../src/$1',
  },
  testRegex: '.+\\.e2e-spec\\.ts$',
  setupFiles: ['<rootDir>/../jest.setup.ts'],
  detectOpenHandles: true,
};
