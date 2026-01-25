# AGENTS Instructions

## Environment

- Use Node.js 22 for development work.
- Ensure required development environment variables are present for local runs:
  - `NODE_ENV=development`
  - `APP_NAME=AssessmentBot-Backend`
  - `APP_VERSION=1.0.0`
  - `LOG_LEVEL=debug`
  - `PORT=3000`

## Setup

- Install dependencies with `npm install`.
- Ensure `.test.env` exists (copy from `.test.env.example` and set `GEMINI_API_KEY` if needed).
- Run `npm run prepare` to configure Husky hooks.

## Quality and testing

- Lint with `npm run lint` (or `npm run lint:fix` when applying fixes).
- Enforce British English with `npm run lint:british` or `./scripts/check-british-english.sh`.
- Run tests with `npm run test` (and `npm run test:e2e` or `npm run test:cov` when appropriate).

## Agents and delegation

Use the `scripts/codex-delegate.ts` CLI to delegate focused work to sub-agents.
Prefer short, well-scoped tasks and provide clear acceptance criteria.
Refer to `docs/` for detailed guidance on code style, testing, environment configuration, and prompt templates:

- Code style: `docs/development/code-style.md`
- Testing: `docs/testing/README.md`, `docs/testing/PRACTICAL_GUIDE.md`, `docs/testing/E2E_GUIDE.md`, `docs/testing/PROD_TESTS_GUIDE.md`
- Environment configuration: `docs/configuration/environment.md`
- Prompt system: `docs/prompts/README.md`

- Implementation agent (`--role implementation`)
  - Use for feature work, bug fixes, or refactors.
  - Provide the desired behaviour, files to touch, and any constraints (for example, stick to existing NestJS patterns and avoid new dependencies).
- Testing agent (`--role testing`)
  - Use for validation plans, test execution, and coverage assessment.
  - Provide the affected areas and which checks to prioritise (for example, `npm run test` or `npm run test:e2e`).
- Review agent (`--role review`)
  - Use for risk assessment and code review feedback.
  - Provide the change summary and files to focus on.
- Documentation agent (`--role documentation`)
  - Use after non-trivial code changes to ensure docs stay accurate and current.
  - Provide the relevant code changes, files that need doc updates, and target audience details.
  - Expect concise, developer-focused updates with examples where helpful.

Example usage:

```bash
npm run dev:delegate -- --role implementation --task "Add input validation to the assessment controller" --instructions "Prefer existing DTO patterns; update tests as needed."
```

Suggested workflow:

1. Run `--role implementation` to deliver code changes.
2. Run `--role testing` to validate changes.
3. Run `--role review` to assess risks and improvements.
4. Run `--role documentation` for any non-trivial change to keep docs accurate.

## Common commands

- Build: `npm run build`
- Dev server: `npm run start:dev`
- Debug server: `npm run debug`

## Ignore patterns

- `node_modules/**`
- `dist/**`
- `coverage/**`
- `*.log`
- `.env`
- `.test.env`
- `.env.local`
