# ESM Refactoring TODO List

This document outlines the steps required to refactor the Assessment Bot Backend to be fully compliant with ECMAScript Modules (ESM). This refactoring aims to leverage modern JavaScript features, improve tree-shaking capabilities, and align with future Node.js and browser standards.

## Phase 1: Preparation and Configuration

1.  **Backup Current State:**
    - Create a dedicated Git branch for this refactoring effort.
    - Ensure all current tests are passing on the `main` branch.

2.  **Update `package.json`:**
    - Ensure `"type": "module"` is present at the root level of `package.json`.
    - Remove any `postbuild` scripts that modify `dist/package.json` to set `"type": "commonjs"`.

3.  **Update `tsconfig.json`:**
    - Set `"module": "NodeNext"` or `"ESNext"` in `compilerOptions`.
    - Set `"moduleResolution": "NodeNext"` or `"Bundler"` (depending on NestJS/TypeScript version and specific needs).
    - Consider `"allowImportingTsExtensions": true` (requires TypeScript 5.0+).
    - Ensure `"target"` is set to a modern ECMAScript version (e.g., `"ES2022"`).
    - Verify `"outDir": "./dist"` and `"rootDir": "./src"` are correctly configured.

4.  **Update `jest.config.js` (or `jest-e2e.config.cjs`):**
    - Configure Jest to work with ESM. This often involves:
      - Setting `"transform": {}` or using `ts-jest` with ESM-specific options.
      - Using `"moduleNameMapper"` for path aliases if `baseUrl` is used in `tsconfig.json`.
      - Ensuring `"testEnvironment": "node"` is compatible with ESM.
      - Potentially using experimental Node.js flags for Jest (`--experimental-vm-modules`).

## Phase 2: Codebase Refactoring

1.  **Convert `require()` to `import`:**
    - Globally replace `require()` calls with `import` statements.
    - Pay close attention to default vs. named imports.

2.  **Add `.js` Extensions to Local Imports:**
    - **Crucial Step:** For all relative imports within the codebase (e.g., `import { MyClass } from './my-class';`), explicitly add the `.js` extension in the import path (e.g., `import { MyClass } from './my-class.js';`). This is a strict requirement for ESM in Node.js.
    - Consider using a tool or script to automate this if the codebase is large.

3.  **Convert `module.exports` to `export`:**
    - Globally replace `module.exports` and `exports` with `export` statements.
    - Distinguish between `export default` and named exports.

4.  **Handle `__dirname` and `__filename`:**
    - In ESM, `__dirname` and `__filename` are not directly available. Replace their usage with `import.meta.url` and Node.js's `url` module utilities (e.g., `fileURLToPath`, `dirname`).

5.  **Review Dynamic Imports:**
    - If any dynamic `import()` calls exist, ensure they are correctly handled and resolve to ESM.

## Phase 3: Build and Deployment Adjustments

1.  **Verify `nest build` Output:**
    - After refactoring, run `npm run build` and inspect the `dist` directory.
    - Ensure compiled files are correctly structured and use ESM syntax.
    - Verify that `dist/package.json` correctly has `"type": "module"`.

2.  **Update Dockerfile:**
    - Ensure the `CMD` instruction correctly points to the ESM entry point (e.g., `node dist/src/main.js`).
    - Verify that the Docker build process correctly handles ESM compilation and module resolution.

3.  **Update `docker-compose.yml`:**
    - Ensure any volume mounts are compatible with the new ESM build output.

## Phase 4: Testing and Verification

1.  **Run All Tests:**
    - Execute `npm test` and `npm run test:e2e` to ensure all unit, integration, and E2E tests pass with the ESM refactoring.
    - Address any new test failures related to module resolution or syntax.

2.  **Manual Verification:**
    - Start the application locally and within Docker.
    - Test protected and unprotected endpoints to ensure full functionality.

## Phase 5: Cleanup and Documentation

1.  **Remove Workarounds:**
    - Remove any previous CommonJS-related workarounds or configurations that are no longer necessary.

2.  **Update Documentation:**
    - Update `GEMINI.md` and any other relevant documentation to reflect the full ESM compliance.
    - Document any specific ESM-related patterns or conventions adopted.

## Important Considerations:

- **Dependency Compatibility:** Some older npm packages might not be fully ESM-compatible. Be prepared to find ESM alternatives or use tools like `esm` or `patch-package` as temporary workarounds.
- **Incremental Approach:** For larger codebases, consider an incremental refactoring approach, converting modules one by one.
- **Tooling Support:** Ensure your IDE (VS Code), linters (ESLint), and other development tools fully support ESM.
