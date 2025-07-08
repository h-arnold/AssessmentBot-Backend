# Identified Code Smells and Issues

This document outlines identified code smells and issues based on the project's core principles and current implementation status. These should be addressed by another engineer.

## 1. Security & Linting Issues

- [x] **ESLint Security Plugin Configuration**: The `eslint-plugin-security` is not correctly configured or is failing to run effectively, as evidenced by its inability to detect intentional security vulnerabilities (e.g., `eval()`) and persistent `parserOptions.project` errors. This directly violates the "Security First" principle. (Refer to `Stage1/TODO.md` - Section 8.5, Blocker) **NOTE**: `parserOptions.project` errors resolved by aligning module system, but `eslint-plugin-security` still fails to detect `eval()`.
- [x] **ESLint Formatting Rules & Pre-commit Hook Effectiveness**: ESLint's formatting rules may not be strict enough, or the pre-commit hook's reliance on `eslint --fix` prevents it from effectively *blocking* commits with formatting issues. This can lead to inconsistent code style if developers do not manually run `lint:fix`. (Refer to `Stage1/TODO.md` - Section 8.5, Blocker)
- [x] **False Positives in Security Linting**: While deemed false positives, the `security/detect-object-injection` warnings indicate a need for better linter configuration to reduce noise or a more explicit way to mark safe access patterns. (Refer to `Stage2/TODO.md` - Notes from Code Review)
- [x] **`no-explicit-any` Violations**: The presence and subsequent resolution of `no-explicit-any` warnings suggest a potential for `any` to be used in the codebase, which should be strictly avoided to maintain type safety. (Refer to `Stage2/TODO.md` - Notes from Code Review)

## 2. TDD & Test Coverage Gaps

- [ ] **Incomplete Stage 3 Test Cases**: Numerous tests listed in `Stage3/TestCases.md` are marked as `[ ]` (not implemented/passed), despite the corresponding items in `Stage3/TODO.md` being marked as `[x]` (complete). This indicates a significant gap in test coverage for core utilities (HttpExceptionFilter, ZodValidationPipe, JsonParserUtil) and global setup, directly contradicting the "Test-Driven Development (TDD)" principle. Specific areas include:
  - `HttpExceptionFilter` logging and global application.
  - `ZodValidationPipe` for nested schemas, error formatting, sanitization, controller integration, and global application.
  - `JsonParserUtil` for irreparable JSON, logging, and error handling.
  - Global setup integration tests for pipes, filters, and logging.
  - Security and performance tests for error responses, large payloads, and efficiency.
  - Library integration tests for `jsonrepair` and `Zod`.
- [ ] **`console.error` in Tests**: Relying on `console.error` output in tests for validation failures, while functional, can lead to noisy test output. It is generally better practice to capture and assert on logs programmatically. (Refer to `Stage2/TODO.md` - Notes from Code Review)

## 3. Design & Implementation Discrepancies

- [ ] **Missing `json-repair` Functionality**: The critical `json-repair` library could not be installed, leading to the `JsonParserUtil` being implemented as a basic wrapper around `JSON.parse`. This severely compromises the "LLM Integration" and "JSON Repair and Parsing" objectives (Stage 7), which rely on robust malformed JSON handling. This needs immediate attention. (Refer to `Stage3/TODO.md` - Green Phase, Note)
- [ ] **`JsonParserUtil` Scope Change**: The removal of tests for circular references and various JSON edge cases in `JsonParserUtil` (due to `json-repair` not being used) suggests a significant reduction in the utility's intended scope and robustness for handling LLM responses. (Refer to `Stage3/TODO.md` - Red Phase, JsonParserUtil Tests) **NOTE**: Revisit the edge cases but leave the ciruclar reference tests as they are not relevant to the current implementation.
- [ ] **Module Resolution Workaround**: The change to `tsconfig.json` to `commonjs` and the addition of a `postbuild` script to create `dist/package.json` with `"type": "commonjs"` might be a workaround for module resolution issues. Investigate if there's a more idiomatic NestJS/TypeScript solution or if this is a standard pattern. (Refer to `Stage1/TODO.md` - Section 8.2, Note)

## 4. Documentation & Naming Conventions

- [ ] **Inconsistent British English Spelling**: The project mandates British English, but inconsistencies exist:
  - `sanitise` (British) vs `sanitize` (American) used in `ImplementationOverview.md` and `Stage3/TestCases.md` respectively.
  - `optimisation` (British) vs `optimization` (American) used in `ImplementationOverview.md`.
    All code, comments, and documentation should consistently use British English spellings.
