# Zod v4 Migration & Deprecated API Refactor Plan

This plan outlines the steps required to refactor the codebase for Zod v4 compatibility and remove deprecated APIs, ensuring future-proof validation and error handling.

```markdown
- [ ] Step 1: Manually review all Zod schema definitions and validation logic in `src/` for deprecated patterns (especially custom error messages, `.superRefine()`, `.strict()`, `.passthrough()`, `.strip()`, `.deepPartial()`, `.nonempty()`, `.default()`, `.function()`, `.record()`, `.string().email()`, `.string().ip()`, `.string().cidr()`).
- [ ] Step 2: Refactor error customisation: - Replace `message`, `invalid_type_error`, `required_error`, and `errorMap` with the new `error` parameter.
- [ ] Step 3: Refactor schema methods: - Replace `.superRefine()` with `.check()`. - Replace `.strict()`/`.passthrough()` with `z.strictObject()`/`z.looseObject()`. - Remove `.strip()`, `.nonstrict()`, `.deepPartial()` and refactor logic as needed. - Update `.nonempty()` to `.min(1)` if type inference is important. - Update `.default()` usage to ensure the default value matches the output type. - Refactor `.function()` usage to the new function factory API. - Update `.record()` to use two arguments.
- [ ] Step 4: Refactor string format validators: - Replace `.string().email()` with `z.email()`. - Replace `.string().ip()` with `z.ipv4()`/`z.ipv6()`. - Replace `.string().cidr()` with `z.cidrv4()`/`z.cidrv6()`.
- [ ] Step 5: Refactor error handling: - Replace `.addIssue()`, `.addIssues()` with direct pushes to the `issues` array. - Replace `.flatten()`/`.formErrors()`/`.format()` with `z.treeifyError()`.
- [ ] Step 6: Update imports if needed (use `"zod"` for v4, `"zod/v4/core"` for advanced usage).
- [ ] Step 7: Upgrade Zod, dotenv, and @types/node to the latest versions.
- [ ] Step 8: Run all tests and fix any failures.
- [ ] Step 9: Document all changes in commit messages and update relevant documentation.
```

---

**Tip:** After upgrading, run the full test suite and address any failures related to validation, error handling, or schema definitions. Refer to the Zod v4 changelog and migration guide for details on each breaking change.
