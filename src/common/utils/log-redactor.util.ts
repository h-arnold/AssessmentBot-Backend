// src/common/utils/log-redactor.util.ts
import { IncomingMessage } from 'http';

export class LogRedactor {
  /**
   * Clones the request object and redacts sensitive headers.
   * @param req The incoming HTTP request.
   * @returns A cloned and redacted request object.
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
