import {
  DEFAULT_MAX_ITEM_CHARS,
  formatTurnEvent,
  truncateOutputItem,
} from '../../scripts/codex-delegate-formatter';

describe('codex delegate formatter', () => {
  describe('truncateOutputItem', () => {
    it('keeps short strings intact', () => {
      expect(truncateOutputItem('short', 10)).toBe('short');
    });

    it('truncates long strings to the specified length', () => {
      const input = 'a'.repeat(DEFAULT_MAX_ITEM_CHARS + 5);
      const output = truncateOutputItem(input, DEFAULT_MAX_ITEM_CHARS);

      expect(output).toHaveLength(DEFAULT_MAX_ITEM_CHARS);
      expect(output.endsWith('…')).toBe(true);
    });
  });

  describe('formatTurnEvent', () => {
    it('formats turn.started events', () => {
      expect(formatTurnEvent({ type: 'turn.started' })).toBe('turn.started');
    });

    it('formats turn.completed events with usage', () => {
      expect(
        formatTurnEvent({
          type: 'turn.completed',
          usage: { input_tokens: 12, output_tokens: 34 },
        }),
      ).toBe('turn.completed: input 12, output 34');
    });

    it('formats turn.completed events without usage', () => {
      expect(formatTurnEvent({ type: 'turn.completed' })).toBe(
        'turn.completed',
      );
    });

    it('formats turn.completed events with partial usage', () => {
      expect(
        formatTurnEvent({
          type: 'turn.completed',
          usage: { input_tokens: 12 },
        }),
      ).toBe('turn.completed: input 12, output 0');
    });

    it('formats turn.failed events', () => {
      expect(
        formatTurnEvent({
          type: 'turn.failed',
          error: { message: 'Boom' },
        }),
      ).toBe('turn.failed: Boom');
    });

    it('formats turn.failed events without error details', () => {
      expect(formatTurnEvent({ type: 'turn.failed' })).toBe(
        'turn.failed: Unknown error',
      );
    });

    it('formats turn.error events', () => {
      expect(formatTurnEvent({ type: 'error', message: 'Nope' })).toBe(
        'turn.error: Nope',
      );
    });

    it('formats turn.error events without a message', () => {
      expect(formatTurnEvent({ type: 'error' })).toBe(
        'turn.error: Unknown error',
      );
    });
  });
});
