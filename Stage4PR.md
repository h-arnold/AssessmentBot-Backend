feat(auth): Complete Stage 4 - API Key Authentication and Refinements

This Pull Request completes the implementation of Stage 4, focusing on API Key Authentication and addressing critical module resolution issues.

**Key Features and Implementations:**

- **API Key Authentication:**
  - Implemented `AuthModule`, `ApiKeyService`, `ApiKeyStrategy`, and `ApiKeyGuard` for secure API key-based authentication.
  - Integrated the guard on protected routes (`/protected` endpoint).
  - Configured `ConfigService` to load and validate API keys from environment variables.
  - Added comprehensive unit tests for `AuthModule`, `ApiKeyService`, `ApiKeyStrategy`, and `ApiKeyGuard`.
  - Implemented E2E tests to verify the end-to-end authentication flow, including handling of valid/invalid/missing API keys and consistent error responses.
  - Created `docs/auth/API_Key_Management.md` documenting best practices for API key generation, rotation, usage, and security considerations.

- **Module Resolution and Compilation Fixes:**
  - **Problem:** Encountered persistent `ERR_MODULE_NOT_FOUND` and `SyntaxError: Cannot use import statement outside a module` errors during application startup, particularly in Docker. These were caused by:
    - Incorrect Docker volume mounts overwriting compiled `dist` files.
    - Mismatched `CMD` paths in `Dockerfile` and `start:prod` scripts.
    - A conflict between TypeScript compiling to ES Modules and Node.js attempting to load them as CommonJS due to `package.json` and `postbuild` script configurations.
  - **Solution:**
    - Removed problematic `.:/app` volume mount from `docker-compose.yml`.
    - Corrected `CMD` in `Dockerfile` and `start:prod` script in `package.json` to `dist/src/main.js`.
    - Aligned module compilation by setting `"module": "CommonJS"` in `tsconfig.json` and ensuring the `postbuild` script sets `"type": "commonjs"` in `dist/package.json`, resolving the ES Module/CommonJS conflict.

**Verification:**

- All unit tests (`npm test`) passed successfully.
- All E2E tests (`npm run test:e2e`) passed successfully.
- Manual verification confirmed:
  - Protected endpoints return `200 OK` with valid API keys.
  - Protected endpoints return `401 Unauthorized` with invalid/missing API keys.
  - Unprotected endpoints remain accessible without authentication.
- Application starts and runs correctly both locally and within Docker.

**Documentation:**

- Updated `docs/ImplementationPlan/Stage4/TODO.md` to reflect completion of all steps, including detailed commit IDs.
- Added a detailed explanation of module resolution and compilation issues encountered during Stage 4 to `docs/ImplementationPlan/ImplementationOverview.md` to prevent future occurrences.
- Created `docs/ImplementationPlan/Stage4/EsmRefactorTODO.md` outlining steps for future refactoring to full ESM compliance.

**Related Issues/Tasks:**

- Closes all tasks in `docs/ImplementationPlan/Stage4/TODO.md`.
