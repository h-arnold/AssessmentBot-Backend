import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Codex } from '@openai/codex-sdk';

import { createDelegateOutputEmitter } from './codex-delegate-output.ts';

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
  verbose: false,
};

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));

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

const BOOLEAN_KEYS = ['network', 'verbose', 'structured'] as const;
type BooleanOptionKey = (typeof BOOLEAN_KEYS)[number];
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

function isBooleanOption(key: keyof DelegateOptions): key is BooleanOptionKey {
  return BOOLEAN_KEYS.includes(key as BooleanOptionKey);
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
    if (isBooleanOption(key)) {
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
    switch (key) {
      case 'role':
        options.role = value;
        break;
      case 'task':
        options.task = value;
        break;
      case 'instructions':
        options.instructions = value;
        break;
      case 'model':
        options.model = value;
        break;
      case 'reasoning':
        options.reasoning = value;
        break;
      case 'workingDir':
        options.workingDir = value;
        break;
      case 'sandbox':
        options.sandbox = value as DelegateOptions['sandbox'];
        break;
      case 'approval':
        options.approval = value as DelegateOptions['approval'];
        break;
      case 'webSearch':
        options.webSearch = value as DelegateOptions['webSearch'];
        break;
      case 'schemaFile':
        options.schemaFile = value;
        break;
      case 'logFile':
        options.logFile = value;
        break;
      case 'maxItems': {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          options.maxItems = parsed;
        }
        break;
      }
      default:
        break;
    }
    index += 1;
  }
  return options;
}

function resolvePromptTemplate(role: string): string {
  const fileName = `${role}.md`;
  const templatePath = path.join(CURRENT_DIR, 'agent-prompts', fileName);
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
  let finalResponse = '';
  let runError: Error | undefined;

  const logPath =
    options.logFile ?? path.join(process.cwd(), 'codex-delegate.log');

  const emitter = createDelegateOutputEmitter(options, (chunk) => {
    process.stdout.write(chunk);
  });

  for await (const event of streamed.events) {
    if (options.verbose) {
      appendFileSync(logPath, JSON.stringify(event) + '\n');
    }
    const result = emitter.handleEvent(event);
    if (result.finalResponse) {
      finalResponse = result.finalResponse;
    }
    if (result.runError) {
      runError = result.runError;
      break;
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
  if (runError) {
    throw runError;
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(message + '\n');
  process.exitCode = 1;
});
