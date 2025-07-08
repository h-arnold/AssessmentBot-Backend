### Stage 2: TODO List

#### Red Phase: Test-Driven Steps (Write failing tests and stubs)

- [X] Create `config.module.spec.ts` and add tests:
  - [X] `ConfigModule should be defined and importable`
  - [X] `ConfigModule should export ConfigService`

- [X] Create `config.service.spec.ts` and add tests:
  - [X] `ConfigService should load environment variables from process.env`
  - [X] `ConfigService should load variables from .env file`
  - [X] `ConfigService should prioritize process.env over .env file`

- [X] Write Zod schema validation tests:
  - [X] `Validation should fail when NODE_ENV is missing`
  - [X] `Validation should fail when PORT is missing`
  - [X] `Validation should pass with valid NODE_ENV values`
  - [X] `Validation should fail with invalid NODE_ENV values`
  - [X] `PORT should be validated as a number`
  - [X] `PORT should be within valid range`

- [X] Add schema tests for optional and default values: (commit: 888ccc0)
  - [X] `APP_NAME should return default value when not set`
  - [X] `APP_VERSION should be optional and return undefined`

- [X] Add service-level tests for value types: (commit: 888ccc0)
  - [X] `ConfigService should return PORT as a number`

- [X] Add `.env.example` tests:
  - [X] `.env.example should contain all required variables`
  - [X] `.env.example should use placeholder values`

- [X] Add environment loading priority & missing file tests:
  - [X] `Process environment should override .env file`
  - [X] `Missing .env file should not cause errors`

- [ ] Add a note to clarify the scope of Zod validation in Stage 2:
  - [ ] Add a note to `README.md` or `ImplementationOverview.md` clarifying that the `ZodValidationPipe` is part of Stage 3 and that Stage 2 focuses on environment validation at startup.

#### Green Phase: Implementation and Verification (Make tests pass)

- [X] Scaffold `ConfigModule` and `ConfigService` with stub methods to satisfy imports

- [X] Implement environment loading logic using `dotenv`

- [X] Define Zod schema:

  ```typescript
  const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_NAME: z.string().default('AssessmentBot-Backend'),
    APP_VERSION: z.string().optional(),
  });
  ```

- [X] Integrate validation into `ConfigModule.forRoot()` and apply schema

- [X] Populate `ConfigService` to return validated config values

- [X] Create `.env.example` file with placeholders for all required variables

- [X] Import `ConfigModule` in `AppModule`

- [X] Run tests and ensure all previously failing tests now pass
