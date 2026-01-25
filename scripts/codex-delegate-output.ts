import {
  DEFAULT_MAX_ITEM_CHARS,
  formatTurnEvent,
  truncateOutputItem,
} from './codex-delegate-formatter.ts';

type OutputOptions = {
  verbose?: boolean;
  maxItems?: number;
};

type OutputWriter = (chunk: string) => void;

type OutputCounts = {
  turnEvents: number;
  commands: number;
  fileChanges: number;
  toolCalls: number;
  webQueries: number;
};

type OutputHeaders = {
  turnEvents: boolean;
  commands: boolean;
  fileChanges: boolean;
  toolCalls: boolean;
  webQueries: boolean;
};

type OutputState = {
  counts: OutputCounts;
  headers: OutputHeaders;
};

type OutputResult = {
  finalResponse?: string;
  runError?: Error;
};

type ItemCompletedEvent = {
  type: 'item.completed';
  item:
    | { type: 'agent_message'; text: string }
    | { type: 'command_execution'; command: string }
    | { type: 'file_change'; changes?: Array<{ kind: string; path: string }> }
    | { type: 'mcp_tool_call'; server: string; tool: string }
    | { type: 'web_search'; query: string };
};

type TurnCompletedEvent = {
  type: 'turn.completed';
  usage?: { input_tokens?: number; output_tokens?: number };
};

type TurnFailedEvent = {
  type: 'turn.failed';
  error?: { message?: string };
};

type TurnStartedEvent = { type: 'turn.started' };

type TurnErrorEvent = { type: 'error'; message?: string };

type OutputEvent =
  | ItemCompletedEvent
  | TurnCompletedEvent
  | TurnFailedEvent
  | TurnStartedEvent
  | TurnErrorEvent;

function shouldEmit(count: number, maxItems: number): boolean {
  return count < maxItems;
}

function writeHeaderOnce(
  state: OutputState,
  key: keyof OutputHeaders,
  label: string,
  write: OutputWriter,
): void {
  if (!state.headers[key]) {
    write(`${label}:\n`);
    state.headers[key] = true;
  }
}

function writeListItem(
  state: OutputState,
  key: keyof OutputHeaders,
  label: string,
  value: string,
  write: OutputWriter,
): void {
  writeHeaderOnce(state, key, label, write);
  write(`- ${value}\n`);
}

export function createDelegateOutputEmitter(
  options: OutputOptions,
  write: OutputWriter,
): {
  handleEvent: (event: OutputEvent) => OutputResult;
  state: OutputState;
} {
  const maxItems = options.maxItems ?? Number.POSITIVE_INFINITY;
  const state: OutputState = {
    counts: {
      turnEvents: 0,
      commands: 0,
      fileChanges: 0,
      toolCalls: 0,
      webQueries: 0,
    },
    headers: {
      turnEvents: false,
      commands: false,
      fileChanges: false,
      toolCalls: false,
      webQueries: false,
    },
  };

  const handleEvent = (event: OutputEvent): OutputResult => {
    if (event.type === 'turn.started' || event.type === 'turn.completed') {
      const summary = formatTurnEvent(event);
      if (summary && shouldEmit(state.counts.turnEvents, maxItems)) {
        writeListItem(state, 'turnEvents', 'Turn events', summary, write);
        state.counts.turnEvents += 1;
      }
      return {};
    }

    if (event.type === 'turn.failed') {
      const summary = formatTurnEvent(event);
      if (summary && shouldEmit(state.counts.turnEvents, maxItems)) {
        writeListItem(state, 'turnEvents', 'Turn events', summary, write);
        state.counts.turnEvents += 1;
      }
      return { runError: new Error(event.error?.message ?? 'Unknown error') };
    }

    if (event.type === 'error') {
      const summary = formatTurnEvent(event);
      if (summary && shouldEmit(state.counts.turnEvents, maxItems)) {
        writeListItem(state, 'turnEvents', 'Turn events', summary, write);
        state.counts.turnEvents += 1;
      }
      return { runError: new Error(event.message ?? 'Unknown error') };
    }

    if (event.type === 'item.completed') {
      const item = event.item;
      if (item.type === 'agent_message') {
        return { finalResponse: item.text };
      }
      if (!options.verbose && item.type === 'command_execution') {
        if (shouldEmit(state.counts.commands, maxItems)) {
          writeListItem(
            state,
            'commands',
            'Commands',
            truncateOutputItem(item.command, DEFAULT_MAX_ITEM_CHARS),
            write,
          );
          state.counts.commands += 1;
        }
      }
      if (!options.verbose && item.type === 'file_change') {
        const changes = Array.isArray(item.changes) ? item.changes : [];
        for (const change of changes) {
          if (!shouldEmit(state.counts.fileChanges, maxItems)) {
            break;
          }
          const entry = truncateOutputItem(
            `${change.kind}: ${change.path}`,
            DEFAULT_MAX_ITEM_CHARS,
          );
          writeListItem(state, 'fileChanges', 'File changes', entry, write);
          state.counts.fileChanges += 1;
        }
      }
      if (!options.verbose && item.type === 'mcp_tool_call') {
        if (shouldEmit(state.counts.toolCalls, maxItems)) {
          writeListItem(
            state,
            'toolCalls',
            'Tool calls',
            truncateOutputItem(
              `${item.server}:${item.tool}`,
              DEFAULT_MAX_ITEM_CHARS,
            ),
            write,
          );
          state.counts.toolCalls += 1;
        }
      }
      if (!options.verbose && item.type === 'web_search') {
        if (shouldEmit(state.counts.webQueries, maxItems)) {
          writeListItem(
            state,
            'webQueries',
            'Web searches',
            truncateOutputItem(item.query, DEFAULT_MAX_ITEM_CHARS),
            write,
          );
          state.counts.webQueries += 1;
        }
      }
    }

    return {};
  };

  return { handleEvent, state };
}
