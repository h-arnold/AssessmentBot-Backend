// src/common/utils/log-redactor.util.ts
import { IncomingMessage } from 'http';

/**
 * Utility class for redacting sensitive information from log entries.
 *
 * This class provides methods to sanitise HTTP request objects before logging,
 * ensuring that sensitive data such as authorization headers are not exposed
 * in log files.
 */
export class LogRedactor {
  /**
   * Clones the request object and redacts sensitive headers.
   *
   * Creates a shallow copy of the incoming HTTP request and removes or masks
   * sensitive headers such as authorization tokens to prevent them from
   * appearing in log files.
   *
   * @param req - The incoming HTTP request
   * @returns A cloned and redacted request object safe for logging
   */
  static redactRequest(req: IncomingMessage): IncomingMessage {
    // Shallow clone the request object
    const clonedReq = Object.assign({}, req);
    // Clone headers to avoid mutating the original
    clonedReq.headers = { ...req.headers };
    if (clonedReq.headers.authorization) {
      clonedReq.headers.authorization = 'Bearer <redacted>';
    }
    return clonedReq;
  }
}
