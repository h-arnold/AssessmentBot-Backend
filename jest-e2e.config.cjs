module.exports = {
  moduleFileExtensions: [
    "js",
    "json",
    "ts"
  ],
  rootDir: "test",
  testEnvironment: "node",
  
  transform: {
    "^.+\.(t|j)s$": "ts-jest"
  },
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/../src/$1"
  },
  testRegex: ".+\.e2e-spec\.ts$",
  setupFiles: ["<rootDir>/setup-e2e.ts"]
};