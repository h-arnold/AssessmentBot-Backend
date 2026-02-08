import { ArgumentsHost, ExecutionContext } from '@nestjs/common';

type HttpMockOptions = {
  method?: string;
  url?: string;
  originalUrl?: string;
  ip?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  statusCode?: number;
  includeNext?: boolean;
};

type HttpRequestMock = {
  method: string;
  url: string;
  originalUrl: string;
  ip: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

const createHttpRequest = (options: HttpMockOptions = {}): HttpRequestMock => {
  const url = options.url ?? '/test';
  return {
    method: options.method ?? 'GET',
    url,
    originalUrl: options.originalUrl ?? url,
    ip: options.ip ?? '127.0.0.1',
    headers: options.headers ?? { 'user-agent': 'jest' },
    body: options.body ?? {},
  };
};

export const createHttpExecutionContext = (
  options: HttpMockOptions = {},
): {
  context: ExecutionContext;
  request: HttpRequestMock;
  response: { statusCode: number };
} => {
  const request = createHttpRequest(options);
  const response = { statusCode: options.statusCode ?? 200 };
  const context = {
    switchToHttp: (): {
      getRequest: () => HttpRequestMock;
      getResponse: () => { statusCode: number };
    } => ({
      getRequest: (): HttpRequestMock => request,
      getResponse: (): { statusCode: number } => response,
    }),
  } as unknown as ExecutionContext;

  return { context, request, response };
};

export const createHttpArgumentsHost = (
  options: HttpMockOptions = {},
): {
  argumentsHost: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
  getRequest: jest.Mock;
  getResponse: jest.Mock;
  request: HttpRequestMock;
} => {
  const request = createHttpRequest(options);
  const json = jest.fn();
  const status = jest
    .fn()
    .mockImplementation((): { json: jest.Mock } => ({ json }));
  const getResponse = jest
    .fn()
    .mockImplementation((): { status: jest.Mock } => ({ status }));
  const getRequest = jest
    .fn()
    .mockImplementation((): HttpRequestMock => request);
  const httpArgumentsHost = jest.fn().mockImplementation(
    (): {
      getResponse: jest.Mock;
      getRequest: jest.Mock;
      getNext?: jest.Mock;
    } => ({
      getResponse,
      getRequest,
      ...(options.includeNext ? { getNext: jest.fn() } : {}),
    }),
  );

  const argumentsHost: ArgumentsHost = {
    switchToHttp: httpArgumentsHost,
    getArgByIndex: jest.fn(),
    getArgs: jest.fn(),
    getType: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  };

  return { argumentsHost, json, status, getRequest, getResponse, request };
};
