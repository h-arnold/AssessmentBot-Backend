import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { Codex } from '@openai/codex-sdk';

type DelegateOptions = {
  role: string;
  task: string;
  instructions: string;
  model?: string;
  reasoning?: string;
  workingDir?: string;
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
  approval?: 'never' | 'on-request' | 'on-failure' | 'untrusted';
  network?: boolean;
  webSearch?: 'disabled' | 'cached' | 'live';
  verbose?: boolean;
  structured?: boolean;
  schemaFile?: string;
  logFile?: string;
  maxItems?: number;
};

const DEFAULT_OPTIONS: DelegateOptions = {
  role: 'implementation',
  task: '',
  instructions: '',
  sandbox: 'danger-full-access',
  approval: 'never',
  network: true,
  webSearch: 'live',
};

const ARG_ALIASES: Record<string, keyof DelegateOptions> = {
  '--role': 'role',
  '--task': 'task',
  '--instructions': 'instructions',
  '--model': 'model',
  '--reasoning': 'reasoning',
  '--working-dir': 'workingDir',
  '--sandbox': 'sandbox',
  '--approval': 'approval',
  '--network': 'network',
  '--web-search': 'webSearch',
  '--verbose': 'verbose',
  '--structured': 'structured',
  '--schema-file': 'schemaFile',
  '--log-file': 'logFile',
  '--max-items': 'maxItems',
};

const BOOLEAN_OPTIONS = new Set<keyof DelegateOptions>([
  'network',
  'verbose',
  'structured',
]);
const REASONING_LEVELS = new Set(['minimal', 'low', 'medium', 'high', 'xhigh']);

function parseBoolean(value: string): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function isOption(value: string | undefined): boolean {
  return Boolean(value && value.startsWith('--') && value in ARG_ALIASES);
}

function parseArgs(argv: string[]): DelegateOptions {
  const options: DelegateOptions = { ...DEFAULT_OPTIONS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const key = ARG_ALIASES[arg];
    if (!key) {
      continue;
    }
    const value = argv[index + 1];
    if (BOOLEAN_OPTIONS.has(key)) {
      if (value && !isOption(value)) {
        const parsed = parseBoolean(value);
        if (parsed !== undefined) {
          options[key] = parsed;
          index += 1;
          continue;
        }
      }
      options[key] = true;
      continue;
    }
    if (!value || isOption(value)) {
      continue;
    }
    if (key === 'maxItems') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        options[key] = parsed;
      }
    } else {
      options[key] = value;
    }
    index += 1;
  }
  return options;
}

function resolvePromptTemplate(role: string): string {
  const fileName = `${role}.md`;
  const templatePath = path.join(__dirname, 'agent-prompts', fileName);
  try {
    return readFileSync(templatePath, 'utf-8').trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Error reading prompt template for role "${role}":`, error);
    }
    return '';
  }
}

function buildPrompt(options: DelegateOptions): string {
  const template = resolvePromptTemplate(options.role);
  const sections = [
    template,
    options.instructions ? `Instructions:\n${options.instructions}` : '',
    options.task ? `Task:\n${options.task}` : '',
  ].filter((section) => section.length > 0);

  return sections.join('\n\n');
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options.task) {
    throw new Error('Missing required --task value.');
  }

  const defaultSchema = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      status: { type: 'string' },
      risks: { type: 'array', items: { type: 'string' } },
      actions: { type: 'array', items: { type: 'string' } },
      nextSteps: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'status'],
    additionalProperties: true,
  } as const;

  let outputSchema: unknown | undefined;
  if (options.schemaFile) {
    try {
      const schemaPath = path.resolve(options.schemaFile);
      outputSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to read or parse schema file at ${options.schemaFile}: ${message}`,
      );
    }
  } else if (options.structured) {
    outputSchema = defaultSchema;
  }
  if (options.reasoning && !REASONING_LEVELS.has(options.reasoning)) {
    throw new Error(
      `Invalid --reasoning value "${options.reasoning}". Expected one of: ${[
        ...REASONING_LEVELS,
      ].join(', ')}.`,
    );
  }

  const codex = new Codex();
  const thread = codex.startThread({
    model: options.model,
    modelReasoningEffort: options.reasoning as
      | 'minimal'
      | 'low'
      | 'medium'
      | 'high'
      | 'xhigh'
      | undefined,
    workingDirectory: options.workingDir,
    sandboxMode: options.sandbox,
    approvalPolicy: options.approval,
    networkAccessEnabled: options.network,
    webSearchMode: options.webSearch,
  });

  const prompt = buildPrompt(options);
  const streamed = await thread.runStreamed(prompt, { outputSchema });
  const commands: string[] = [];
  const fileChanges: string[] = [];
  const toolCalls: string[] = [];
  const webQueries: string[] = [];
  let finalResponse = '';
  let usageSummary = '';

  const logPath =
    options.logFile ?? path.join(process.cwd(), 'codex-delegate.log');

  for await (const event of streamed.events) {
    if (options.verbose) {
      appendFileSync(logPath, JSON.stringify(event) + '\n');
    }
    if (event.type === 'item.completed') {
      const item = event.item;
      if (item.type === 'agent_message') {
        finalResponse = item.text;
      }
      if (item.type === 'command_execution') {
        commands.push(item.command);
      }
      if (item.type === 'file_change') {
        const files = item.changes.map(
          (change) => `${change.kind}: ${change.path}`,
        );
        fileChanges.push(...files);
      }
      if (item.type === 'mcp_tool_call') {
        toolCalls.push(`${item.server}:${item.tool}`);
      }
      if (item.type === 'web_search') {
        webQueries.push(item.query);
      }
    }
    if (event.type === 'turn.completed') {
      usageSummary = `Usage: input ${event.usage.input_tokens}, output ${event.usage.output_tokens}`;
    }
    if (event.type === 'turn.failed') {
      throw new Error(event.error.message);
    }
    if (event.type === 'error') {
      throw new Error(event.message);
    }
  }

  if (!options.verbose) {
    const limit = options.maxItems ?? Number.POSITIVE_INFINITY;
    if (commands.length > 0) {
      const limited = commands.slice(0, limit);
      process.stdout.write(`Commands:\n- ${limited.join('\n- ')}\n\n`);
    }
    if (fileChanges.length > 0) {
      const limited = fileChanges.slice(0, limit);
      process.stdout.write(`File changes:\n- ${limited.join('\n- ')}\n\n`);
    }
    if (toolCalls.length > 0) {
      const limited = toolCalls.slice(0, limit);
      process.stdout.write(`Tool calls:\n- ${limited.join('\n- ')}\n\n`);
    }
    if (webQueries.length > 0) {
      const limited = webQueries.slice(0, limit);
      process.stdout.write(`Web searches:\n- ${limited.join('\n- ')}\n\n`);
    }
  }

  if (finalResponse) {
    if (outputSchema) {
      try {
        const parsed = JSON.parse(finalResponse);
        process.stdout.write(JSON.stringify(parsed, null, 2) + '\n');
      } catch {
        process.stdout.write(finalResponse + '\n');
      }
    } else {
      process.stdout.write(finalResponse + '\n');
    }
  }
  if (usageSummary) {
    process.stdout.write(usageSummary + '\n');
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(message + '\n');
  process.exitCode = 1;
});
