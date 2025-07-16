### Stage 2: TODO List

#### Red Phase: Test-Driven Steps (Write failing tests and stubs)

- [x] Create `config.module.spec.ts` and add tests:
  - [x] `ConfigModule should be defined and importable`
  - [x] `ConfigModule should export ConfigService`

- [x] Create `config.service.spec.ts` and add tests:
  - [x] `ConfigService should load environment variables from process.env`
  - [x] `ConfigService should load variables from .env file`
  - [x] `ConfigService should prioritize process.env over .env file`

- [x] Write Zod schema validation tests:
  - [x] `Validation should fail when NODE_ENV is missing`
  - [x] `Validation should fail when PORT is missing`
  - [x] `Validation should pass with valid NODE_ENV values`
  - [x] `Validation should fail with invalid NODE_ENV values`
  - [x] `PORT should be validated as a number`
  - [x] `PORT should be within valid range`

- [x] Add schema tests for optional and default values: (commit: 888ccc0)
  - [x] `APP_NAME should return default value when not set`
  - [x] `APP_VERSION should be optional and return undefined`

- [x] Add service-level tests for value types: (commit: 888ccc0)
  - [x] `ConfigService should return PORT as a number`

- [x] Add `.env.example` tests:
  - [x] `.env.example should contain all required variables`
  - [x] `.env.example should use placeholder values`

- [x] Add environment loading priority & missing file tests:
  - [x] `Process environment should override .env file`
  - [x] `Missing .env file should not cause errors`

- [ ] Add a note to clarify the scope of Zod validation in Stage 2:
  - [ ] Add a note to `README.md` or `ImplementationOverview.md` clarifying that the `ZodValidationPipe` is part of Stage 3 and that Stage 2 focuses on environment validation at startup.

#### Green Phase: Implementation and Verification (Make tests pass)

- [x] Scaffold `ConfigModule` and `ConfigService` with stub methods to satisfy imports

- [x] Implement environment loading logic using `dotenv`

- [x] Define Zod schema:

  ```typescript
  const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_NAME: z.string().default('AssessmentBot-Backend'),
    APP_VERSION: z.string().optional(),
  });
  ```

- [x] Integrate validation into `ConfigModule.forRoot()` and apply schema

- [x] Populate `ConfigService` to return validated config values

- [x] Create `.env.example` file with placeholders for all required variables

- [x] Import `ConfigModule` in `AppModule`

- [x] Run tests and ensure all previously failing tests now pass

**Notes from Code Review:**

- The `security/detect-object-injection` warnings in `src/config/config.env-example.spec.ts` and `src/config/config.service.ts` are considered false positives. The keys being accessed are either hardcoded or constrained by Zod schemas, meaning they are not user-controlled and do not pose a security risk.
- The `no-explicit-any` warning in `src/config/config.module.spec.ts` was resolved by changing `any` to `unknown` for error handling.
- `console.error` messages in test output for validation failures are expected and indicate correct test behavior.
