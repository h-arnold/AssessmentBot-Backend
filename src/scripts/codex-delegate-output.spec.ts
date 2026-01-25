import { createDelegateOutputEmitter } from '../../scripts/codex-delegate-output';

describe('codex delegate output emitter', () => {
  it('streams turn events as they arrive', () => {
    const writes: string[] = [];
    const emitter = createDelegateOutputEmitter(
      { verbose: false, maxItems: 5 },
      (chunk) => writes.push(chunk),
    );

    emitter.handleEvent({ type: 'turn.started' });
    emitter.handleEvent({
      type: 'turn.completed',
      usage: { input_tokens: 5, output_tokens: 7 },
    });

    expect(writes).toEqual([
      'Turn events:\n',
      '- turn.started\n',
      '- turn.completed: input 5, output 7\n',
    ]);
  });

  it('streams item summaries with truncation and headers', () => {
    const writes: string[] = [];
    const emitter = createDelegateOutputEmitter(
      { verbose: false, maxItems: 2 },
      (chunk) => writes.push(chunk),
    );

    const longCommand = 'a'.repeat(300);
    emitter.handleEvent({
      type: 'item.completed',
      item: { type: 'command_execution', command: longCommand },
    });
    emitter.handleEvent({
      type: 'item.completed',
      item: { type: 'web_search', query: 'search' },
    });

    expect(writes[0]).toBe('Commands:\n');
    expect(writes[1]).toMatch(/^-\s+a{249}…\n$/);
    expect(writes[2]).toBe('Web searches:\n');
    expect(writes[3]).toBe('- search\n');
  });

  it('streams file changes and tool calls with max item limits', () => {
    const writes: string[] = [];
    const emitter = createDelegateOutputEmitter(
      { verbose: false, maxItems: 1 },
      (chunk) => writes.push(chunk),
    );

    emitter.handleEvent({
      type: 'item.completed',
      item: {
        type: 'file_change',
        changes: [
          { kind: 'update', path: 'a.ts' },
          { kind: 'delete', path: 'b.ts' },
        ],
      },
    });
    emitter.handleEvent({
      type: 'item.completed',
      item: { type: 'mcp_tool_call', server: 'mcp', tool: 'fetch' },
    });

    expect(writes).toEqual([
      'File changes:\n',
      '- update: a.ts\n',
      'Tool calls:\n',
      '- mcp:fetch\n',
    ]);
  });

  it('returns final response and errors for caller handling', () => {
    const emitter = createDelegateOutputEmitter({ verbose: false }, () => {
      // no-op
    });

    const responseResult = emitter.handleEvent({
      type: 'item.completed',
      item: { type: 'agent_message', text: 'final' },
    });
    expect(responseResult.finalResponse).toBe('final');

    const errorResult = emitter.handleEvent({
      type: 'turn.failed',
      error: { message: 'Boom' },
    });
    expect(errorResult.runError).toBeInstanceOf(Error);
    expect(errorResult.runError?.message).toBe('Boom');
  });

  it('streams errors even with missing message data', () => {
    const writes: string[] = [];
    const emitter = createDelegateOutputEmitter(
      { verbose: false, maxItems: 2 },
      (chunk) => writes.push(chunk),
    );

    const result = emitter.handleEvent({ type: 'error' });

    expect(result.runError?.message).toBe('Unknown error');
    expect(writes).toEqual(['Turn events:\n', '- turn.error: Unknown error\n']);
  });

  it('suppresses command summaries when verbose is enabled', () => {
    const writes: string[] = [];
    const emitter = createDelegateOutputEmitter(
      { verbose: true, maxItems: 2 },
      (chunk) => writes.push(chunk),
    );

    emitter.handleEvent({
      type: 'item.completed',
      item: { type: 'command_execution', command: 'ls' },
    });
    emitter.handleEvent({ type: 'turn.started' });

    expect(writes).toEqual(['Turn events:\n', '- turn.started\n']);
  });

  it('respects maxItems when set to zero', () => {
    const writes: string[] = [];
    const emitter = createDelegateOutputEmitter(
      { verbose: false, maxItems: 0 },
      (chunk) => writes.push(chunk),
    );

    emitter.handleEvent({ type: 'turn.started' });
    emitter.handleEvent({
      type: 'item.completed',
      item: { type: 'command_execution', command: 'ls' },
    });

    expect(writes).toEqual([]);
  });
});
