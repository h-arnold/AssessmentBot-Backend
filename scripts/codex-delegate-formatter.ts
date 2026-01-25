export const DEFAULT_MAX_ITEM_CHARS = 250;

export function truncateOutputItem(
  value: string,
  limit: number = DEFAULT_MAX_ITEM_CHARS,
): string {
  if (value.length <= limit) {
    return value;
  }
  if (limit <= 1) {
    return value.slice(0, limit);
  }
  return `${value.slice(0, limit - 1)}…`;
}

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

type TurnEvent =
  | TurnCompletedEvent
  | TurnFailedEvent
  | TurnStartedEvent
  | TurnErrorEvent;

export function formatTurnEvent(event: TurnEvent): string | null {
  switch (event.type) {
    case 'turn.started':
      return 'turn.started';
    case 'turn.completed': {
      const inputTokens = event.usage?.input_tokens;
      const outputTokens = event.usage?.output_tokens;
      if (typeof inputTokens === 'number' || typeof outputTokens === 'number') {
        return `turn.completed: input ${inputTokens ?? 0}, output ${outputTokens ?? 0}`;
      }
      return 'turn.completed';
    }
    case 'turn.failed':
      return `turn.failed: ${event.error?.message ?? 'Unknown error'}`;
    case 'error':
      return `turn.error: ${event.message ?? 'Unknown error'}`;
    default:
      return null;
  }
}
