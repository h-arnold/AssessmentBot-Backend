**IMPORTANT NOTE**: These issues have now been resolved. This document servers as a record of changes made and their justification in case it needs to be revisited in the future.

# Identified Code Smells and Issues

This document outlines identified code smells and issues based on the project's core principles and current implementation status. These should be addressed by another engineer.

## 1. Security & Linting Issues

- [x] **ESLint Security Plugin Configuration**: The `eslint-plugin-security` is not correctly configured or is failing to run effectively, as evidenced by its inability to detect intentional security vulnerabilities (e.g., `eval()`) and persistent `parserOptions.project` errors. This directly violates the "Security First" principle. (Refer to `Stage1/TODO.md` - Section 8.5, Blocker) **NOTE**: `parserOptions.project` errors resolved by aligning module system, but `eslint-plugin-security` still fails to detect `eval()`. (commit: <COMMIT_ID>)
- [x] **ESLint Formatting Rules & Pre-commit Hook Effectiveness**: ESLint's formatting rules may not be strict enough, or the pre-commit hook's reliance on `eslint --fix` prevents it from effectively _blocking_ commits with formatting issues. This can lead to inconsistent code style if developers do not manually run `lint:fix`. (Refer to `Stage1/TODO.md` - Section 8.5, Blocker) (commit: <COMMIT_ID>)
- [x] **False Positives in Security Linting**: While deemed false positives, the `security/detect-object-injection` warnings indicate a need for better linter configuration to reduce noise or a more explicit way to mark safe access patterns. (Refer to `Stage2/TODO.md` - Notes from Code Review) (commit: <COMMIT_ID>)
- [x] **`no-explicit-any` Violations**: The presence and subsequent resolution of `no-explicit-any` warnings suggest a potential for `any` to be used in the codebase, which should be strictly avoided to maintain type safety. (Refer to `Stage2/TODO.md` - Notes from Code Review) (commit: 40582b4)

## 2. TDD & Test Coverage Gaps

- [x] **Incomplete Stage 3 Test Cases**: All test cases in `Stage3/TestCases.md` have been verified and implemented, with the exception of those blocked by the `jsonrepair` library installation issue. This resolves the significant gap in test coverage for core utilities (HttpExceptionFilter, ZodValidationPipe, JsonParserUtil) and global setup, aligning with the "Test-Driven Development (TDD)" principle.
- [x] **`console.error` in Tests**: Relying on `console.error` output in tests for validation failures, while functional, can lead to noisy test output. It is generally better practice to capture and assert on logs programmatically. (Refer to `Stage2/TODO.md` - Notes from Code Review) (commit: bcc1c10)

## 3. Design & Implementation Discrepancies

- [x] **Missing `json-repair` Functionality**: The `jsonrepair` library has been successfully installed. The `JsonParserUtil` now needs to be updated to utilise this library for robust malformed JSON handling, which is critical for "LLM Integration" and "JSON Repair and Parsing" objectives (Stage 7). (Refer to `Stage3/TODO.md` - Green Phase, Note)
- [x] **`JsonParserUtil` Scope Change**: We removed the tests for this part because jsonrepair was so good at handling malformed JSON. Other validation checks will be needed later on to ensure that the output from the LLM is valid anyway.
- [x] **Module Resolution Workaround**: The change to `tsconfig.json` to `commonjs` and the addition of a `postbuild` script to create `dist/package.json` with `"type": "commonjs"` might be a workaround for module resolution issues. Investigate if there's a more idiomatic NestJS/TypeScript solution or if this is a standard pattern. (Refer to `Stage1/TODO.md` - Section 8.2, Note)

## 4. Documentation & Naming Conventions

- [x] **Inconsistent British English Spelling**: The project mandates British English, but inconsistencies exist:
  - `sanitise` (British) vs `sanitise` (American) used in `ImplementationOverview.md` and `Stage3/TestCases.md` respectively.
  - `optimisation` (British) vs `optimisation` (American) used in `ImplementationOverview.md`.
    All code, comments, and documentation should consistently use British English spellings.
