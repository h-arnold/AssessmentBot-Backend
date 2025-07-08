### Stage 2: TODO List

#### Red Phase: Test-Driven Steps (Write failing tests and stubs)

- [X] Create `config.module.spec.ts` and add tests:
  - [X] `ConfigModule should be defined and importable`
  - [X] `ConfigModule should export ConfigService`

- [ ] Create `config.service.spec.ts` and add tests:
  - [ ] `ConfigService should load environment variables from process.env`
  - [ ] `ConfigService should load variables from .env file`
  - [ ] `ConfigService should prioritize process.env over .env file`

- [ ] Write Zod schema validation tests:
  - [ ] `Validation should fail when NODE_ENV is missing`
  - [ ] `Validation should fail when PORT is missing`
  - [ ] `Validation should pass with valid NODE_ENV values`
  - [ ] `Validation should fail with invalid NODE_ENV values`
  - [ ] `PORT should be validated as a number`
  - [ ] `PORT should be within valid range`

- [ ] Add schema tests for optional and default values:
  - [ ] `APP_NAME should return default value when not set`
  - [ ] `APP_VERSION should be optional and return undefined`

- [ ] Add service-level tests for value types:
  - [ ] `ConfigService should return PORT as a number`

- [ ] Add `.env.example` tests:
  - [ ] `.env.example should contain all required variables`
  - [ ] `.env.example should use placeholder values`

- [ ] Add environment loading priority & missing file tests:
  - [ ] `Process environment should override .env file`
  - [ ] `Missing .env file should not cause errors`

- [ ] Add a note to clarify the scope of Zod validation in Stage 2:
  - [ ] Add a note to `README.md` or `ImplementationOverview.md` clarifying that the `ZodValidationPipe` is part of Stage 3 and that Stage 2 focuses on environment validation at startup.

#### Green Phase: Implementation and Verification (Make tests pass)

- [ ] Scaffold `ConfigModule` and `ConfigService` with stub methods to satisfy imports

- [ ] Implement environment loading logic using `dotenv`

- [ ] Define Zod schema:

  ```typescript
  const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_NAME: z.string().default('AssessmentBot-Backend'),
    APP_VERSION: z.string().optional(),
  });
  ```

- [ ] Integrate validation into `ConfigModule.forRoot()` and apply schema

- [ ] Populate `ConfigService` to return validated config values

- [ ] Create `.env.example` file with placeholders for all required variables

- [ ] Import `ConfigModule` in `AppModule`

- [ ] Run tests and ensure all previously failing tests now pass
