# Stage 6: LLM and Prompt Abstraction TODO

- [x] Create a new git branch for this work:
  ```bash
  git checkout -b Stage6
  ```

This document outlines the tasks for refactoring the application to use a flexible abstraction for LLM interactions and a factory pattern for prompt generation.

---

### 1. Setup and Dependencies

**Objective**: Prepare the environment by installing necessary libraries.

- [x] Install required npm packages:
  ```bash
  npm install @google/genai mustache jsonrepair zod
  npm install -D @types/mustache
  ```
- [x] Add `GEMINI_API_KEY=` to the `.env.example` file.
- [x] Update the central Zod schema for environment variables in the `ConfigModule` to include validation for `GEMINI_API_KEY`.

---

### 2. LLM Service Abstraction and Response Validation

**Objective**: Define an abstract `LLMService` interface, create a concrete `GeminiService` implementation, and ensure all LLM responses are strictly validated.

#### 2.1. LLM Response Validation Types

**Objective**: Create a Zod schema to validate the structure of the JSON response from the LLM.

##### Red Phase: Write Failing Tests for Schemas

- [x] Create a new directory `src/llm/`.
- [x] Create the test file `src/llm/types.spec.ts`.
- [x] Write tests for the `LlmResponseSchema` that assert:
  - [x] A valid payload with all criteria (`completeness`, `accuracy`, `spag`), correct scores (0-5), and non-empty reasoning passes validation.
  - [x] A payload with a missing criterion (e.g., `spag`) is rejected.
  - [x] A payload with an invalid score (e.g., `6` or `-1`) is rejected.
  - [x] A payload with a non-integer score is rejected.
  - [x] A payload with empty `reasoning` is rejected.
  - [x] A payload with a missing `score` or `reasoning` field is rejected.

##### Green Phase: Implement the Zod Schemas

- [x] Create the file `src/llm/types.ts`.
- [x] Implement the `AssessmentCriterionSchema` and `LlmResponseSchema` using Zod, as defined in `docs/ImplementationPlan/Stage6/LlmServiceClassDesign.md`.
- [x] Export the inferred `LlmResponse` type.
- [x] Run the tests and ensure they all pass.

##### Refactor & Commit

- [x] Review the schema and test code.
- [x] Commit the changes (e.g., `feat(llm): add zod schemas for llm response`). (commit: 3565952)
  - [ ] Note any issues or changes that might affect future steps.

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

#### 2.2. LLM Service Implementation (`GeminiService`)

**Objective**: Implement the `LLMService` interface with a concrete `GeminiService` that validates its output.

##### Red Phase: Write Failing Tests for `GeminiService`

- [x] Create the test file `src/llm/gemini.service.spec.ts`.
- [x] Following `docs/ImplementationPlan/Stage6/TestCases.md`, write tests that assert:
  - [x] **Initialisation**: The service correctly initialises the `@google/genai` SDK.
  - [x] **Payload Handling**: The correct model is used and the request is built correctly for both text and multimodal payloads.
  - [x] **Response Handling & Validation**:
    - [x] The service successfully parses, validates, and returns a response that conforms to the `LlmResponseSchema`.
    - [x] The service can repair a malformed JSON string and then successfully validate it.
    - [x] The service throws a `ZodError` if the repaired JSON is structurally invalid (e.g., missing `accuracy` criterion or score is out of range).
    - [x] The service logs and throws a user-friendly error when the underlying SDK call fails.

##### Green Phase: Implement `LLMService` and `GeminiService`

- [x] Create `src/llm/llm.service.interface.ts` and define the `LLMService` interface, ensuring the `send` method returns a `Promise<LlmResponse>`.
- [x] Create `src/llm/gemini.service.ts`.
- [x] Implement the `GeminiService` class.
  - [x] In the `send` method, after repairing and parsing the JSON, use `LlmResponseSchema.parse()` to validate the object before returning it.
- [x] Run the tests and ensure they all pass.

##### Refactor & Commit

- [x] Review the service and test code.
- [x] Commit the changes (e.g., `feat(llm): implement GeminiService with response validation`). (commit: 287bb32)
  - [ ] Note any issues or changes that might affect future steps.

#### Issues and Solutions Log

_(Use this space to document any challenges, workarounds, or key decisions made during this section.)_

---

### 3. Prompt Generation System

**Objective**: Implement a factory pattern for creating different types of prompts (`Text`, `Table`, `Image`) based on a modular, test-driven design.

- [x] **Review Design**: Read `docs/ImplementationPlan/Stage6/PromptClassDesign.md` for the overall architecture and `docs/ImplementationPlan/Stage6/TestCases.md` for specific test requirements.

#### 3.1. Prompt Base Class

**Objective**: Create an abstract base class for all prompts that handles common logic like input validation and template loading.

- [x] **Review Design**: Read the "Prompt Base Class" sections in `PromptClassDesign.md` and `TestCases.md`.

##### Red Phase: Write Failing Tests for `Prompt` Base Class

- [x] Create a new directory `src/prompt/`.
- [x] Create the test file `src/prompt/prompt.base.spec.ts`.
- [x] Following `docs/ImplementationPlan/Stage6/TestCases.md`, write tests for the `Prompt` base class constructor and its Zod validation schema that assert:
  - [x] A valid input object (with `referenceTask`, `studentTask`, `emptyTask`) is parsed successfully.
  - [x] A `ZodError` is thrown if the `referenceTask` property is missing or not a string.
  - [x] A `ZodError` is thrown if the `studentTask` property is missing or not a string.
  - [x] A `ZodError` is thrown if the `emptyTask` property is missing or not a string.

##### Green Phase: Implement the `Prompt` Base Class

- [x] Create the file `src/prompt/prompt.base.ts`.
- [x] Implement the `PromptInputSchema` using Zod to validate the constructor inputs.
- [x] Implement the abstract `Prompt` class:
  - [x] The constructor should accept `inputs: unknown`, parse it with the schema, and assign the validated properties.
  - [x] Implement the `protected async readMarkdown(name: string)` method to read template files. Note: The path should be resolved relative to the project root, targeting `docs/ImplementationPlan/Stage6/Prompts/`.
  - [x] Implement the `protected render(template: string, data: Record<string, string>)` method using `mustache`.
  - [x] Define the `public abstract buildMessage(): Promise<string | object>` method.
- [x] Run the tests and ensure they all pass.

##### Refactor & Commit

- [x] Review the base class and test code for clarity, correctness, and adherence to the design.
- [x] Commit the changes (e.g., `feat(prompt): create abstract prompt base class`). (commit: 04450a3)

---

#### 3.2. Concrete Prompt Subclasses

**Objective**: Implement the concrete prompt classes for Text, Table, and Image tasks.

- [x] **Review Design**: Read the "Subclasses" sections in `PromptClassDesign.md` and the relevant sections in `TestCases.md`.

##### Red Phase: Write Failing Tests for Subclasses

- [x] Create `src/prompt/text.prompt.spec.ts`. Write tests to:
  - [x] Verify that `buildMessage` reads the correct template (`textPrompt.md`).
  - [x] Verify that `buildMessage` correctly renders the template with the provided task data.
- [x] Create `src/prompt/table.prompt.spec.ts`. Write tests to:
  - [x] Verify that `buildMessage` reads the correct template (`tablePrompt.md`).
  - [x] Verify that `buildMessage` correctly renders the template with the provided task data.
- [x] Create `src/prompt/image.prompt.spec.ts`. Write tests to:
  - [x] Verify the constructor correctly handles image data alongside text data.
  - [x] Verify that `buildMessage` reads the correct template (`imagePrompt.md`).
  - [x] Verify that `buildMessage` returns a structured object containing the rendered prompt text and correctly formatted image data (base64 string and mime type).

##### Green Phase: Implement Subclasses

- [x] Create `src/prompt/text.prompt.ts`. Implement the `TextPrompt` class, extending `Prompt` and implementing `buildMessage`.
- [x] Create `src/prompt/table.prompt.ts`. Implement the `TablePrompt` class, extending `Prompt` and implementing `buildMessage`.
- [x] Create `src/prompt/image.prompt.ts`. Implement the `ImagePrompt` class, extending `Prompt` with its own constructor to accept image data and implementing `buildMessage`.
- [x] Run all subclass tests and ensure they pass.

##### Refactor & Commit

- [x] Review all three subclass implementations and their tests.
- [x] Commit the changes (e.g., `feat(prompt): implement concrete prompt subclasses`). (commit: 3e421de)

---

#### 3.3. Prompt Factory

**Objective**: Implement a factory to encapsulate the creation logic for different prompt instances.

- [x] **Review Design**: Read the "PromptFactory" sections in `PromptClassDesign.md` and `TestCases.md`.

##### Red Phase: Write Failing Tests for `PromptFactory`

- [x] Create `src/prompt/prompt.factory.spec.ts`.
- [x] Write tests that assert:
  - [x] The factory returns a `TextPrompt` instance when `taskType` is `'TEXT'`.
  - [x] The factory returns a `TablePrompt` instance when `taskType` is `'TABLE'`.
  - [x] The factory returns an `ImagePrompt` instance when `taskType` is `'IMAGE'`.
  - [x] The factory correctly passes the DTO data to the created prompt's constructor.
  - [x] The factory throws an `Error` for an unsupported `taskType`.

##### Green Phase: Implement `PromptFactory`

- [x] Create `src/prompt/prompt.factory.ts`.
- [x] Implement the `PromptFactory` class with a `create(dto: CreateAssessorDto)` method.
- [x] Use a `switch` statement on `dto.taskType` to instantiate and return the correct prompt subclass.
- [x] Run the factory tests and ensure they pass.

##### Refactor & Commit

- [x] Review the factory implementation and tests.
- [x] Commit the changes (e.g., `feat(prompt): implement prompt factory`). (commit: ccd85c9)
- [ ] Note any issues or changes that might affect future steps below.

---

### 4. Module Integration

**Objective**: Integrate the new `LlmModule` and `PromptModule` into the application and refactor `AssessorService` to use them.

- [ ] **Review Design**: Read `LlmServiceClassDesign.md` and `PromptClassDesign.md` for module structure and `TestCases.md` for consumer test cases (`AssessorService`).

#### 4.1. Create and Integrate Modules

**Objective**: Define the `LlmModule` and `PromptModule` and integrate them into the main application structure.

##### Red Phase: Write Failing Integration Tests

- [x] Create `src/llm/llm.module.spec.ts`. Write a test to ensure the `LlmModule` can be created and that it correctly provides the `LLMService`.
- [x] Create `src/prompt/prompt.module.spec.ts`. Write a test to ensure the `PromptModule` can be created and that it correctly provides the `PromptFactory`.
- [x] Update `src/v1/assessor/assessor.service.spec.ts`:
  - [x] Modify the `TestingModule` to import the new (mocked) `LlmModule` and `PromptModule`.
  - [x] Refactor existing tests for `AssessorService` to reflect its new dependencies (`PromptFactory` and `LLMService`) instead of its old implementation details. The tests should now focus on the interaction between the service and its dependencies (e.g., "does it call `promptFactory.create`?", "does it call `llmService.send`?").

##### Green Phase: Implement and Integrate Modules

- [x] Create `src/llm/llm.module.ts`. Define the module to provide `LLMService` (using `GeminiService` as the implementation) and export it.
- [x] Create `src/prompt/prompt.module.ts`. Define the module to provide and export the `PromptFactory`.
- [x] Create `src/v1/assessor/assessor.module.ts` if it doesn't exist. Import `LlmModule` and `PromptModule`.
- [x] Refactor `src/v1/assessor/assessor.service.ts`:
  - [x] Inject `PromptFactory` and `LLMService` into the constructor.
  - [x] Remove the old, hard-coded prompt generation and `HttpService` logic.
  - [x] In the `createAssessment` method:
    1.  Use the `promptFactory` to `create` a prompt instance from the DTO.
    2.  Call `buildMessage()` on the created prompt instance.
    3.  Pass the result to `llmService.send()`.
    4.  Return the validated response from the `llmService`.
- [ ] Run all tests (`assessor.service.spec.ts`, module specs) and ensure they pass.

##### Refactor & Commit

- [ ] Review the module definitions and the refactored `AssessorService`.
- [ ] Commit the changes (e.g., `refactor(assessor): integrate prompt and llm modules`). (commit: ccd85c9)
- [ ] Note any issues or changes that might affect future steps below.

---

### 5. Final Steps

**Objective**: Ensure the new implementation is fully functional and documented.

- [ ] Run the full E2E test suite (`npm run test:e2e`) to ensure the refactoring has not introduced any regressions.
- [ ] Manually test the `/v1/assessor` endpoint using a tool like Postman or cURL with text, table, and image payloads to confirm the end-to-end flow works as expected.
- [ ] Update `README.md` and any other relevant documentation (e.g., `docs/api/API_Documentation.md`) to reflect the new architecture and dependencies (`@google/genai`, `mustache`).
- [ ] Review and merge the `Stage6` branch into the main development branch.
- [ ] Delete the `Stage6` feature branch after successful merge.
- [ ] Note any issues or changes that might affect future steps below.
