# Codex Delegation Action Plan

## Goal

Create a developer-friendly npm script that delegates tasks to Codex sub-agents while keeping the main context clean, enabling targeted work on implementation, testing, and review with configurable permissions and concise outputs.

## Action Plan

### 1) Establish the delegation entry point

1. Add a new TypeScript script at `scripts/codex-delegate.ts` to act as the single entry point for sub-agent runs.
2. Use the `@openai/codex-sdk` `Codex` client and construct a `Thread` per task.
3. Accept inputs via CLI flags (use a small parser or manual parsing) for:
   - `--role` (e.g. `implementation`, `testing`, `review`).
   - `--task` (short task summary).
   - `--instructions` (custom instructions to append to the prompt).
   - `--model` and `--reasoning` (map to `model` and `modelReasoningEffort`).
   - `--working-dir` (map to `workingDirectory`).
4. Ensure the script can be invoked from npm scripts without additional setup beyond environment variables required by Codex.

### 2) Define safe, permissive defaults for permissions

1. Set default `ThreadOptions`:
   - `sandboxMode: "danger-full-access"` (per the preference for permissive settings).
   - `approvalPolicy: "never"` (to avoid friction in non-interactive use).
   - `networkAccessEnabled: true`.
   - `webSearchMode: "live"` (or allow an explicit `--web-search` flag to toggle).
2. Expose CLI overrides for all permission-related fields so tighter restrictions are possible per task:
   - `--sandbox` (values: `read-only`, `workspace-write`, `danger-full-access`).
   - `--approval` (values: `never`, `on-request`, `on-failure`, `untrusted`).
   - `--network` (boolean).
   - `--web-search` (values: `disabled`, `cached`, `live`).

### 3) Implement prompt composition with role templates

1. Create a prompt template directory, e.g. `scripts/agent-prompts/`.
2. Add role templates:
   - `implementation.md`: expected output includes summary, files changed, risks, and next steps.
   - `testing.md`: expected output includes test plan, executed commands, failures, and follow-ups.
   - `review.md`: expected output includes issues, suggestions, and confidence.
3. Compose the final prompt as:
   - Role template contents.
   - Custom instructions (if provided).
   - Task summary and any task context files.

### 4) Enforce concise, decision-ready outputs

1. Use `thread.runStreamed()` to handle events and filter output.
2. Default behaviour:
   - Capture final agent messages.
   - Summarise tool calls and file changes into a brief list.
   - Output usage metadata once per turn.
3. Provide a `--verbose` flag that prints all streamed events for debugging.

### 5) Add structured output support

1. Define a JSON schema (inline or in a local file) with required fields:
   - `summary`, `status`, `risks`, `actions`, `nextSteps`.
2. Pass the schema via `TurnOptions.outputSchema`.
3. Validate the response shape and fall back to plain text if parsing fails.

### 6) Integrate with npm scripts

1. Add an npm script in `package.json` such as:
   - `dev:delegate`: runs `scripts/codex-delegate.ts` with Node 22.
2. Provide a short usage section in `README.md` (or a new doc page) showing:
   - Example invocation with task and custom instructions.
   - How to adjust permissions and verbosity.

### 7) Logging and context hygiene

1. Default output should be short and structured to keep context clean.
2. Include a `--max-context` or `--max-items` option that limits items reported back to the caller.
3. Store full raw event logs to a file when `--verbose` is set, avoiding console noise.

### 8) Validation and rollout

1. Run linting and British English checks after implementation.
2. Add a small smoke test script (optional) to validate the CLI argument handling.
3. Ensure documentation aligns with required environment variables and Node.js 22.
