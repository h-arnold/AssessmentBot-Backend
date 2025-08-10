# Documentation TODO List

This document tracks discrepancies and necessary updates for the project documentation. It is based on a comparison between the documentation and the source code.

## 🚨 Major Discrepancies

- [x] **Fix `CommonModule` Documentation**: The documentation in `docs/modules/common.md` incorrectly lists several utilities as being provided by the module. Update the document to accurately reflect that `CommonModule` only provides `Logger`, `JsonParserUtil`, and the global `HttpExceptionFilter`. The other utilities (`ZodValidationPipe`, `ImageValidationPipe`, etc.) are standalone.

- [ ] **Implement Correct Error Handling for `ResourceExhaustedError`**: The code returns a `500 Internal Server Error` for a `ResourceExhaustedError`, but `docs/architecture/data-flow.md` states it should be a `503 Service Unavailable`. Update the `HttpExceptionFilter` to handle this custom error type and return the correct status code.

- [ ] **Correct `/health` Endpoint Schema**: The schema in `docs/api/schemas.md` for the `GET /health` endpoint is incorrect. It should be updated to remove the `applicationName` field and include the `systemInfo` object, matching the actual response from the `StatusService`.

## ⚠️ Minor Discrepancies and Documentation Issues

- [ ] **Review API Key Exposure in `/check-auth`**: The documentation is inconsistent on whether the API key is returned in the `GET /check-auth` response. Decide on the desired behavior (redacting the key is recommended for security) and update the code and all related documents (`docs/api/API_Documentation.md`, `docs/api/schemas.md`, `docs/modules/status.md`) to be consistent.

- [ ] **Remove Duplicated Content**: Review and refactor the following files to remove duplicated sections:
  - [ ] `docs/api/error-codes.md`
  - [ ] `docs/deployment/cicd.md`
  - [ ] `docs/prompts/templates.md`

- [ ] **Update Main `README.md` TODOs**: Review the `[TODO]` markers in `docs/README.md` and update them to reflect the current status of the documentation.

- [ ] **Fix Formatting in `docs/deployment/production.md`**: Correct the broken markdown formatting for the `Caddyfile` code block and add the missing closing brace.

- [ ] **Clarify Node.js Environment**: In `docs/architecture/overview.md`, clarify the difference between the `node:22-alpine` production environment and the Debian-based development container environment to avoid confusion.
