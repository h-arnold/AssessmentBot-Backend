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
