export default {
  setupFiles: ['<rootDir>/jest.setup.ts'],
  preset: 'ts-jest/presets/default-esm',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          target: 'ES2022',
          lib: ['ES2022'],
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
};
