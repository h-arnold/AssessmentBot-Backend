gh pr create --title "feat: Complete Stage 2: Configuration and Environment Management" --body "This pull request completes Stage 2 of the Assessment Bot Backend implementation, focusing on Configuration and Environment Management.

**Objectives Achieved:**
- Implemented `ConfigModule` to load and validate environment variables using Zod schemas.

**Deliverables Included:**
- `ConfigModule` with Zod-based validation.
- Sample `.env.example` file.
- Integration of `ConfigModule` into `AppModule`.

**Test Coverage:**
- Comprehensive unit tests ensure the application fails to start on missing or invalid environment variables.
- Unit tests cover the validation of environment variables at application startup.

**Note on Zod Validation Scope:**
As per the implementation plan, Zod validation in this stage focuses solely on environment variables at application startup. The `ZodValidationPipe` for request payload validation will be implemented in Stage 3 as part of the `CommonModule`.

All tasks outlined in `docs/ImplementationPlan/Stage 2/TODO.md` have been completed and verified."