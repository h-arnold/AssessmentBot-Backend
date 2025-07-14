// Type guards for LlmPayload shapes

export function isSystemUserMessage(
  message: unknown,
): message is { system: string; user: string } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'system' in message &&
    'user' in message &&
    typeof (message as { system?: unknown }).system === 'string' &&
    typeof (message as { user?: unknown }).user === 'string'
  );
}
