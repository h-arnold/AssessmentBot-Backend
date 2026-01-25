# Codex Delegation

This guide covers the repository's Codex delegation runner and its streamed output behaviour.

## Running a Delegate Task

```bash
npm run dev:delegate -- --role implementation --task "Implement the new endpoint" \
  --instructions "Follow existing NestJS patterns."
```

The runner lives at `scripts/codex-delegate.ts` and streams concise progress signals while the sub-agent works.

## Streamed Output

By default, the runner emits short summaries as items complete:

- **Turn events** such as `turn.started` and `turn.completed` (with token usage when available)
- **Commands** executed by the agent
- **File changes** (added, updated, deleted paths)
- **Tool calls** (for MCP tools)
- **Web searches**

Each section is capped by `--max-items` (per category). Once the cap is reached, additional entries are suppressed.

## Verbose Logging

Use `--verbose` to capture full streaming events to a log file while suppressing the command/file/tool summaries.
Turn events and the final agent response still print to stdout.

```bash
npm run dev:delegate -- --role review --task "Review the latest change" --verbose
```

The log file defaults to `codex-delegate.log` in the current working directory. Override it with `--log-file`.

```bash
npm run dev:delegate -- --role review --task "Review the latest change" \
  --verbose --log-file ./tmp/codex-delegate-review.log
```

## Structured Output

Use `--structured` to request JSON output using the default schema, or provide a custom schema file with
`--schema-file`.

```bash
npm run dev:delegate -- --role testing --task "Run unit tests" --structured
```

## Useful Flags

- `--role` (implementation, testing, review, documentation)
- `--task` (required)
- `--instructions` (optional)
- `--sandbox`, `--approval`, `--network`, `--web-search` (permissions)
- `--structured`, `--schema-file` (structured output)
- `--verbose`, `--log-file`, `--max-items` (streaming output controls)
