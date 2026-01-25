import { createWriteStream, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { Codex, type StreamedEvent } from '@openai/codex-sdk';

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
  timeoutMinutes?: number;
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
  timeoutMinutes: 10,
};

// Use CommonJS __dirname so this script compiles and runs with the project's
// current TypeScript `module: "CommonJS"` setting.
const CURRENT_DIR = __dirname;

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
  '--timeout-minutes': 'timeoutMinutes',
};

const BOOLEAN_KEYS = ['network', 'verbose', 'structured'] as const;
type BooleanOptionKey = (typeof BOOLEAN_KEYS)[number];
// cSpell:ignore xhigh
const REASONING_LEVELS = ['minimal', 'low', 'medium', 'high', 'xhigh'] as const;
type ReasoningLevel = (typeof REASONING_LEVELS)[number];
const SANDBOX_MODES = [
  'read-only',
  'workspace-write',
  'danger-full-access',
] as const;
const APPROVAL_POLICIES = [
  'never',
  'on-request',
  'on-failure',
  'untrusted',
] as const;
const WEB_SEARCH_MODES = ['disabled', 'cached', 'live'] as const;

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

  const ASSIGN_HANDLERS = createAssignHandlers(options);

  function createAssignHandlers(
    opts: DelegateOptions,
  ): Record<string, (v: string) => void> {
    return {
      role: (v: string): void => {
        opts.role = v;
      },
      task: (v: string): void => {
        opts.task = v;
      },
      instructions: (v: string): void => {
        opts.instructions = v;
      },
      model: (v: string): void => {
        opts.model = v;
      },
      reasoning: (v: string): void => {
        opts.reasoning = v;
      },
      workingDir: (v: string): void => {
        opts.workingDir = v;
      },
      sandbox: (v: string): void => {
        opts.sandbox = v as DelegateOptions['sandbox'];
      },
      approval: (v: string): void => {
        opts.approval = v as DelegateOptions['approval'];
      },
      webSearch: (v: string): void => {
        opts.webSearch = v as DelegateOptions['webSearch'];
      },
      schemaFile: (v: string): void => {
        opts.schemaFile = v;
      },
      logFile: (v: string): void => {
        opts.logFile = v;
      },
      maxItems: (v: string): void => {
        const parsed = Number.parseInt(v, 10);
        if (!Number.isNaN(parsed)) {
          opts.maxItems = parsed;
        }
      },
      timeoutMinutes: (v: string): void => {
        const parsed = Number.parseFloat(v);
        if (!Number.isNaN(parsed) && parsed > 0) {
          opts.timeoutMinutes = parsed;
        }
      },
    };
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const key = ARG_ALIASES[arg];
    if (!key) {
      continue;
    }

    const value = argv[i + 1];
    if (isBooleanOption(key)) {
      if (value && !isOption(value)) {
        const parsed = parseBoolean(value);
        if (parsed !== undefined) {
          options[key] = parsed;
          i++;
          continue;
        }
      }
      options[key] = true;
      continue;
    }
    // special flags that take no value and cause immediate action
    // (preserve existing behaviour for legacy flags)
    if (arg === '--list-roles' || arg === '--help' || arg === '-h') {
      // push the flag back so the existing immediate-action handlers below can run
      // (keeps the parsing loop simple and avoids duplicating help/list logic)
      if (!options.task && arg === '--list-roles') {
        // nothing to assign here, will be handled below
      }
      continue;
    }
    if (arg === '--list-roles') {
      const roles = listPromptRoles();
      if (roles.length === 0) {
        console.info('No roles available.');
      } else {
        console.info(`Available roles:\n${roles.join('\n')}`);
      }
      process.exit(0);
    }

    if (arg === '--help' || arg === '-h') {
      console.info(
        [
          'Usage: node scripts/codex-delegate.js [options]',
          '',
          'Options:',
          '  --role <role>             Role to use (default: implementation)',
          '  --task <task>             Short task description (required)',
          '  --instructions <text>     Additional instructions',
          '  --model <model>           Codex model to use',
          '  --reasoning <level>       Reasoning effort (minimal|low|medium|high|xhigh)',
          '  --working-dir <path>      Working directory for the agent',
          '  --sandbox <mode>          Sandbox mode (read-only|workspace-write|danger-full-access)',
          '  --approval <policy>       Approval policy (never|on-request|on-failure|untrusted)',
          '  --network <true|false>    Enable network access (default: true)',
          '  --web-search <mode>       Web search mode (disabled|cached|live)',
          '  --verbose <true|false>    Enable verbose logging',
          '  --structured <true|false> Emit structured JSON output',
          '  --schema-file <path>      Path to JSON schema file for structured output',
          '  --log-file <path>         Path to write a verbose event log',
          '  --max-items <n>           Limit number of items printed in summaries',
          '  --timeout-minutes <n>     Timeout in minutes (default: 10)',
          '  --list-roles              Print available prompt roles and exit',
          '  --help, -h                Show this help message',
        ].join('\n'),
      );
      process.exit(0);
    }
    if (!value || isOption(value)) {
      continue;
    }

    const handler = ASSIGN_HANDLERS[key as string];
    if (handler) {
      handler(value);
      i++;
    }
  }

  return options;
}

function resolvePromptTemplate(role: string): string {
  const fileName = `${role}.md`;
  const templatePath = path.join(CURRENT_DIR, 'agent-prompts', fileName);
  try {
    return readFileSync(templatePath, 'utf-8').trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function listPromptRoles(): string[] {
  const promptsPath = path.join(CURRENT_DIR, 'agent-prompts');
  try {
    return readdirSync(promptsPath)
      .filter((entry) => entry.endsWith('.md'))
      .map((entry) => entry.replace(/\.md$/, ''))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
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

  let outputSchema: Record<string, unknown> | undefined;
  if (options.schemaFile) {
    try {
      const schemaPath = path.resolve(options.schemaFile);
      outputSchema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as Record<
        string,
        unknown
      >;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to read or parse schema file at ${options.schemaFile}: ${message}`,
      );
    }
  } else if (options.structured) {
    outputSchema = defaultSchema as Record<string, unknown>;
  }
  if (
    options.reasoning &&
    !REASONING_LEVELS.includes(options.reasoning as ReasoningLevel)
  ) {
    throw new Error(
      `Invalid --reasoning value "${options.reasoning}". Expected one of: ${[
        ...REASONING_LEVELS,
      ].join(', ')}.`,
    );
  }
  if (options.sandbox && !SANDBOX_MODES.includes(options.sandbox)) {
    throw new Error(
      `Invalid --sandbox value "${options.sandbox}". Expected one of: ${[
        ...SANDBOX_MODES,
      ].join(', ')}.`,
    );
  }
  if (options.approval && !APPROVAL_POLICIES.includes(options.approval)) {
    throw new Error(
      `Invalid --approval value "${options.approval}". Expected one of: ${[
        ...APPROVAL_POLICIES,
      ].join(', ')}.`,
    );
  }
  if (options.webSearch && !WEB_SEARCH_MODES.includes(options.webSearch)) {
    throw new Error(
      `Invalid --web-search value "${options.webSearch}". Expected one of: ${[
        ...WEB_SEARCH_MODES,
      ].join(', ')}.`,
    );
  }

  const availableRoles = listPromptRoles();
  if (availableRoles.length > 0 && !availableRoles.includes(options.role)) {
    throw new Error(
      `Unknown --role "${options.role}". Available roles: ${availableRoles.join(
        ', ',
      )}.`,
    );
  }

  const codex = new Codex();
  // Ensure the reasoning option is narrowed to the allowed literal union before
  // passing it into the Codex API.
  let reasoningArg: ReasoningLevel | undefined;
  if (
    options.reasoning &&
    REASONING_LEVELS.includes(options.reasoning as ReasoningLevel)
  ) {
    reasoningArg = options.reasoning as ReasoningLevel;
  }

  const thread = codex.startThread({
    model: options.model,
    modelReasoningEffort: reasoningArg,
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
  const timeoutMs = (options.timeoutMinutes ?? 10) * 60 * 1000;

  const logPath =
    options.logFile ?? path.join(process.cwd(), 'codex-delegate.log');
  const logStream = options.verbose
    ? createWriteStream(logPath, { flags: 'a' })
    : undefined;

  const iterator = streamed.events[
    Symbol.asyncIterator
  ]() as AsyncIterator<StreamedEvent>;
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Codex delegation timed out after ${options.timeoutMinutes ?? 10} minutes.`,
        ),
      );
    }, timeoutMs);
  });

  try {
    while (true) {
      const nextPromise = iterator.next();
      const result = (await Promise.race([nextPromise, timeoutPromise])) as
        | IteratorResult<StreamedEvent>
        | never;

      if (result.done) {
        break;
      }

      const event = result.value;

      if (options.verbose) {
        logStream?.write(JSON.stringify(event) + '\n');
        process.stdout.write(JSON.stringify(event) + '\n');
      }

      switch (event.type) {
        case 'item.completed': {
          const item = event.item;
          if (!item) {
            break;
          }
          switch (item.type) {
            case 'agent_message':
              finalResponse = item.text;
              break;
            case 'command_execution':
              commands.push(item.command);
              break;
            case 'file_change': {
              const files = item.changes.map(
                (change) => `${change.kind}: ${change.path}`,
              );
              fileChanges.push(...files);
              break;
            }
            case 'mcp_tool_call':
              toolCalls.push(`${item.server}:${item.tool}`);
              break;
            case 'web_search':
              webQueries.push(item.query);
              break;
            default:
              break;
          }
          break;
        }
        case 'turn.completed':
          if (event.usage) {
            const usage = event.usage as {
              input_tokens: number;
              output_tokens: number;
            };
            usageSummary = `Usage: input ${usage.input_tokens}, output ${usage.output_tokens}`;
          }
          break;
        case 'turn.failed':
          throw new Error(
            (event.error as { message?: string } | undefined)?.message ??
              'Unknown error',
          );
        case 'error':
          throw new Error(
            (event.message as string | undefined) ?? 'Unknown error',
          );
        default:
          break;
      }
    }
  } catch (error) {
    await iterator.return?.();
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    logStream?.end();
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

(async (): Promise<void> => {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(message + '\n');
    process.exitCode = 1;
  }
})();
