# Stage 6: LLM and Prompt Abstraction TODO

- [ ] Create a new git branch for this work:
  ```bash
  git checkout -b Stage6
  ```

This document outlines the tasks for refactoring the application to use a flexible abstraction for LLM interactions and a factory pattern for prompt generation.

---

### 1. Setup and Dependencies

**Objective**: Prepare the environment by installing necessary libraries.

- [ ] Install required npm packages:
  ```bash
  npm install @google/genai mustache jsonrepair zod
  npm install -D @types/mustache
  ```
- [ ] Add `GEMINI_API_KEY=` to the `.env.example` file.
- [ ] Update the central Zod schema for environment variables in the `ConfigModule` to include validation for `GEMINI_API_KEY`.

---

### 2. LLM Service Abstraction and Response Validation

**Objective**: Define an abstract `LLMService` interface, create a concrete `GeminiService` implementation, and ensure all LLM responses are strictly validated.

#### 2.1. LLM Response Validation Types

**Objective**: Create a Zod schema to validate the structure of the JSON response from the LLM.

##### Red Phase: Write Failing Tests for Schemas

- [ ] Create a new directory `src/llm/`.
- [ ] Create the test file `src/llm/types.spec.ts`.
- [ ] Write tests for the `LlmResponseSchema` that assert:
  - [ ] A valid payload with all criteria (`completeness`, `accuracy`, `spag`), correct scores (0-5), and non-empty reasoning passes validation.
  - [ ] A payload with a missing criterion (e.g., `spag`) is rejected.
  - [ ] A payload with an invalid score (e.g., `6` or `-1`) is rejected.
  - [ ] A payload with a non-integer score is rejected.
  - [ ] A payload with empty `reasoning` is rejected.
  - [ ] A payload with a missing `score` or `reasoning` field is rejected.

##### Green Phase: Implement the Zod Schemas

- [ ] Create the file `src/llm/types.ts`.
- [ ] Implement the `AssessmentCriterionSchema` and `LlmResponseSchema` using Zod, as defined in `docs/ImplementationPlan/Stage6/LlmServiceClassDesign.md`.
- [ ] Export the inferred `LlmResponse` type.
- [ ] Run the tests and ensure they all pass.

##### Refactor & Commit

- [ ] Review the schema and test code.
- [ ] Commit the changes (e.g., `feat(llm): add zod schemas for llm response`).

---

#### 2.2. LLM Service Implementation (`GeminiService`)

**Objective**: Implement the `LLMService` interface with a concrete `GeminiService` that validates its output.

##### Red Phase: Write Failing Tests for `GeminiService`

- [ ] Create the test file `src/llm/gemini.service.spec.ts`.
- [ ] Following `docs/ImplementationPlan/Stage6/TestCases.md`, write tests that assert:
  - [ ] **Initialisation**: The service correctly initialises the `@google/genai` SDK.
  - [ ] **Payload Handling**: The correct model is used and the request is built correctly for both text and multimodal payloads.
  - [ ] **Response Handling & Validation**:
    - [ ] The service successfully parses, validates, and returns a response that conforms to the `LlmResponseSchema`.
    - [ ] The service can repair a malformed JSON string and then successfully validate it.
    - [ ] The service throws a `ZodError` if the repaired JSON is structurally invalid (e.g., missing `accuracy` criterion or score is out of range).
    - [ ] The service logs and throws a user-friendly error when the underlying SDK call fails.

##### Green Phase: Implement `LLMService` and `GeminiService`

- [ ] Create `src/llm/llm.service.interface.ts` and define the `LLMService` interface, ensuring the `send` method returns a `Promise<LlmResponse>`.
- [ ] Create `src/llm/gemini.service.ts`.
- [ ] Implement the `GeminiService` class.
  - [ ] In the `send` method, after repairing and parsing the JSON, use `LlmResponseSchema.parse()` to validate the object before returning it.
- [ ] Run the tests and ensure they all pass.

##### Refactor & Commit

- [ ] Review the service and test code.
- [ ] Commit the changes (e.g., `feat(llm): implement GeminiService with response validation`).

---

### 3. Prompt Generation System

**Objective**: Implement a factory pattern for creating different types of prompts (`Text`, `Table`, `Image`).

_This section remains unchanged. Follow the Red/Green/Refactor cycles for the Prompt Base Class, PromptFactory, and concrete Prompt subclasses as previously outlined._

---

### 4. Module Integration

**Objective**: Integrate the new `LlmModule` and `PromptModule` into the application and refactor `AssessorService`.

_This section remains unchanged. Follow the Red/Green/Refactor cycles for module integration and the `AssessorService` refactor as previously outlined._

---

### 5. Final Steps

- [ ] Manually test the endpoint to ensure the end-to-end flow works as expected.
- [ ] Update relevant documentation (`README.md`, API docs).
- [ ] Open a Pull Request from the `Stage6` branch to the main branch.
