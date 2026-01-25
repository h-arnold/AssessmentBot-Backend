export type ItemCompletedEvent = {
  type: 'item.completed';
  item:
    | { type: 'agent_message'; text: string }
    | { type: 'command_execution'; command: string }
    | { type: 'file_change'; changes?: Array<{ kind: string; path: string }> }
    | { type: 'mcp_tool_call'; server: string; tool: string }
    | { type: 'web_search'; query: string };
};

export type TurnCompletedEvent = {
  type: 'turn.completed';
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type TurnFailedEvent = {
  type: 'turn.failed';
  error?: { message?: string };
};

export type TurnStartedEvent = { type: 'turn.started' };

export type TurnErrorEvent = { type: 'error'; message?: string };

export type OutputEvent =
  | ItemCompletedEvent
  | TurnCompletedEvent
  | TurnFailedEvent
  | TurnStartedEvent
  | TurnErrorEvent;
