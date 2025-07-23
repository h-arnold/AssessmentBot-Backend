# TODO - Throttler Implementation

## Red Phase

- [ ] **Update `config.service.ts`:**
  - Add `unauthenticatedThrottlerLimit` and `authenticatedThrottlerLimit` to the Zod schema and the `ConfigService` class.
  - Remove the existing `throttlerLimit`.

- [ ] **Update `e2e-test-utils.ts`:**
  - Update the `startApp` function to retrieve the new throttler limits from `ConfigService` and return them.

- [ ] **Run tests and confirm they fail as expected.**

## Green Phase

- [ ] **Update `app.module.ts`:**
  - Configure `ThrottlerModule` with two definitions: `unauthenticated` and `authenticated`.
  - Set the `unauthenticated` throttler as the default.

- [ ] **Update `assessor.controller.ts`:**
  - Apply the `authenticated` throttler to the `create` method using the `@Throttle` decorator.

- [ ] **Update `app.controller.ts`:**
  - Apply the `authenticated` throttler to the `getProtected` method using the `@Throttle` decorator.

- [ ] **Run tests and confirm they pass.**

- [ ] **Review and refactor the implementation.**