import { OutputEvent } from './codex-delegate-events.ts';
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
    switch (event.type) {
      case 'turn.started':
      case 'turn.completed': {
        const summary = formatTurnEvent(event);
        if (summary && shouldEmit(state.counts.turnEvents, maxItems)) {
          writeListItem(state, 'turnEvents', 'Turn events', summary, write);
          state.counts.turnEvents += 1;
        }
        return {};
      }
      case 'turn.failed': {
        const summary = formatTurnEvent(event);
        if (summary && shouldEmit(state.counts.turnEvents, maxItems)) {
          writeListItem(state, 'turnEvents', 'Turn events', summary, write);
          state.counts.turnEvents += 1;
        }
        return { runError: new Error(event.error?.message ?? 'Unknown error') };
      }
      case 'error': {
        const summary = formatTurnEvent(event);
        if (summary && shouldEmit(state.counts.turnEvents, maxItems)) {
          writeListItem(state, 'turnEvents', 'Turn events', summary, write);
          state.counts.turnEvents += 1;
        }
        return { runError: new Error(event.message ?? 'Unknown error') };
      }
      case 'item.completed': {
        const item = event.item;
        if (item.type === 'agent_message') {
          return { finalResponse: item.text };
        }
        if (options.verbose) {
          return {};
        }
        switch (item.type) {
          case 'command_execution':
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
            break;
          case 'file_change': {
            const changes = item.changes ?? [];
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
            break;
          }
          case 'mcp_tool_call':
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
            break;
          case 'web_search':
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
            break;
        }
        return {};
      }
      default:
        return {};
    }
  };

  return { handleEvent, state };
}
