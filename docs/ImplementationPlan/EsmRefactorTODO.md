# ESM Refactoring TODO List

This document outlines the steps required to refactor the Assessment Bot Backend to use ESM syntax throughout the codebase, while compiling to CommonJS for maximum compatibility with NestJS and its ecosystem. This approach leverages modern JavaScript features and prepares the codebase for a future full ESM migration, while ensuring stability with current dependencies.

## Phase 1: Preparation and Configuration

1. **Backup Current State:**
   - Create a dedicated Git branch for this refactoring effort.
   - Ensure all current tests are passing on the `main` branch.
   - [x] **Commit your changes** (commit id: `04c8424`)

2. **Update `package.json`:**
   - Ensure your source code uses ESM syntax (import/export), but set the build output to CommonJS for now.
   - You may keep or remove `"type": "module"` depending on your build and runtime needs, but ensure your build output (e.g., `dist/package.json`) is set to CommonJS if required by NestJS.
   - Remove any `postbuild` scripts that are no longer necessary for module type switching.
   - [x] **Commit your changes** (commit id: `91abeb2`)

3. **Update `tsconfig.json`:**
   - Set `"module": "CommonJS"` in `compilerOptions` to ensure compatibility with NestJS and CommonJS dependencies.
   - Set `"target"` to a modern ECMAScript version (e.g., `"ES2022"`).
   - Verify `"outDir": "./dist"` and `"rootDir": "./src"` are correctly configured.
   - Optionally, use `"moduleResolution": "Node"` or `"NodeNext"` as needed.
   - [x] **Commit your changes** (commit id: `c2febdf`)

4. **Update `jest.config.js` (or `jest-e2e.config.cjs`):**
   - Configure Jest to work with ESM syntax in your source, but ensure it can run tests against CommonJS output.
   - Use `ts-jest` or similar tools to bridge ESM syntax and CommonJS output.
   - [x] **Commit your changes** (commit id: `3e263e7`)

5. **Set Up ESLint Rules to Enforce ESM Syntax:**
   - Install and configure ESLint plugins/rules to detect and prevent CommonJS patterns in your source code:
     - `@typescript-eslint/no-var-requires` (disallow `require()` usage).
     - `import/no-commonjs` (disallow `module.exports` and `exports`).
     - `import/extensions` (enforce explicit `.js` extensions in imports if you want to future-proof for ESM, but this is optional if compiling to CommonJS).
   - Add these rules to your ESLint config and run `npm run lint` to check for violations.
   - [x] **Commit your changes** (commit id: `7d5e05e`)

## Phase 2: Codebase Refactoring

1. **Detect and Remove CommonJS Patterns:**
   - Use ESLint to automatically detect and report any remaining CommonJS patterns.
   - Optionally, run shell commands to search for legacy syntax:
     - `grep -r "require(" src/`
     - `grep -r "module.exports" src/`
     - `grep -r "exports." src/`
   - Refactor any matches to ESM syntax.
   - [x] **Commit your changes** (commit id: `9868d77`)

2. **Convert `require()` to `import`:**
   - Globally replace `require()` calls with `import` statements.
   - Pay close attention to default vs. named imports.
   - [x] **Commit your changes** (commit id: `656a7fd`)

3. **Add `.js` Extensions to Local Imports (Optional):**
   - For future ESM compatibility, you may add `.js` extensions to all relative imports, but this is not required for CommonJS output.
   - Use ESLint to enforce this rule if you want to prepare for a future ESM-only migration.
   - [x] **Commit your changes** (commit id: `fd5d41d`)

4. **Convert `module.exports` to `export`:**
   - Globally replace `module.exports` and `exports` with `export` statements.
   - Distinguish between `export default` and named exports.
   - [x] **Commit your changes** (commit id: `a95716a`)

5. **Handle `__dirname` and `__filename`:**
   - In ESM, `__dirname` and `__filename` are not directly available. If you use these, ensure your code is compatible with both ESM and CommonJS, or use Node.js utilities as needed.
   - [x] **Commit your changes** (commit id: `d65e169`)

6. **Review Dynamic Imports:**
   - If any dynamic `import()` calls exist, ensure they are correctly handled and resolve to ESM.
   - [x] **Commit your changes** (commit id: `7b79de1`)

## Phase 3: Build and Deployment Adjustments

1. **Verify `nest build` Output:**
   - After refactoring, run `npm run build` and inspect the `dist` directory.
   - Ensure compiled files are correctly structured and use CommonJS syntax for compatibility.
   - Verify that `dist/package.json` (if present) correctly has `"type": "commonjs"`.
   - [x] **Commit your changes** (commit id: `7701aff`)

2. **Update Dockerfile:**
   - Ensure the `CMD` instruction correctly points to the CommonJS entry point (e.g., `node dist/src/main.js`).
   - Verify that the Docker build process correctly handles compilation and module resolution.
   - [x] **Commit your changes** (commit id: `f523df1`)

3. **Update `docker-compose.yml`:**
   - Ensure any volume mounts are compatible with the new build output.
   - [x] **Commit your changes** (commit id: `41a1cb2`)

## Phase 4: Testing and Verification

1. **Run All Tests:**
   - Execute `npm test` and `npm run test:e2e` to ensure all unit, integration, and E2E tests pass with the refactoring.
   - Address any new test failures related to module resolution or syntax.
   - [x] **Commit your changes** (commit id: `3069883`)

2. **Manual Verification:**
   - Start the application locally and within Docker.
   - Test protected and unprotected endpoints to ensure full functionality.
   - [x] **Commit your changes** (commit id: `b4c64d7`)

3. **Automated Linting for ESM Syntax Compliance:**
   - Run `npm run lint` to ensure no CommonJS patterns remain and all ESM rules are enforced in your source code.
   - Add a pre-commit hook (e.g., with Husky) to run lint checks for ESM syntax compliance before allowing commits.
   - [ ] **Commit your changes** (commit id: `________`)

## Phase 5: Cleanup and Documentation

1. **Remove Workarounds:**
   - Remove any previous CommonJS-related workarounds or configurations that are no longer necessary.
   - [ ] **Commit your changes** (commit id: `________`)

2. **Update Documentation:**
   - Update `GEMINI.md` and any other relevant documentation to reflect the ESM syntax usage and CommonJS build output.
   - Document any specific ESM-related patterns or conventions adopted.
   - [ ] **Commit your changes** (commit id: `________`)

3. **Dependency Compatibility Review:**
   - Review all dependencies for ESM compatibility. Replace or patch any that are not ESM-ready, and monitor for updates to migrate to full ESM in the future.
   - [ ] **Commit your changes** (commit id: `________`)

## Important Considerations

- **API Key Discrepancy:** Investigate the discrepancy between API key acceptance in tests and production environment.
- **Dependency Compatibility:** Some older npm packages might not be fully ESM-compatible. Be prepared to find ESM alternatives or use tools like `esm` or `patch-package` as temporary workarounds.
- **Incremental Approach:** For larger codebases, consider an incremental refactoring approach, converting modules one by one.
