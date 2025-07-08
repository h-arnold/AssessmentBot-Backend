import {
  HttpException,
  HttpStatus,
  Logger,
  ArgumentsHost,
} from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should format custom error response with timestamp and path', () => {
    // Create a test exception with a custom message and status
    const exception = new HttpException(
      'Test Exception',
      HttpStatus.BAD_REQUEST,
    );
    // Mock the response object's json and status methods
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockImplementation(() => ({
      json: mockJson,
    }));
    // Mock the getResponse method to return the mocked status
    const mockGetResponse = jest.fn().mockImplementation(() => ({
      status: mockStatus,
    }));
    // Mock the getRequest method to return a fake request object
    const mockGetRequest = jest.fn().mockImplementation(() => ({
      url: '/test',
      method: 'POST',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    }));
    // The following function signatures are required to satisfy strict linter and type checks
    // They use explicit generic signatures and type assertions to match the expected interfaces
    function statusFn(): { json: () => void } {
      return { json: (): void => {} };
    }
    /**
     * Mocks the `ArgumentsHost` interface for HTTP requests in NestJS unit tests.
     *
     * This mock provides implementations for `getResponse`, `getRequest`, and `getNext` methods,
     * allowing tests to simulate the behavior of the HTTP context within exception filters or interceptors.
     *
     * @returns An object with mocked `getResponse`, `getRequest`, and `getNext` methods.
     */
    const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
      getNext: jest.fn(() => undefined),
    }));
    /**
     * A mock implementation of the NestJS `ArgumentsHost` interface for use in unit tests.
     *
     * This mock provides stubbed methods for switching between HTTP, RPC, and WebSocket contexts,
     * as well as retrieving arguments and context types. The HTTP context is provided by `mockHttpArgumentsHost`.
     *
     * Methods:
     * - `switchToHttp`: Returns the mocked HTTP arguments host.
     * - `getArgByIndex`: Returns `undefined` for any index, typed as generic `T`.
     * - `getArgs`: Returns an empty array, typed as generic `T`.
     * - `getType`: Always returns `'http'` as the context type.
     * - `switchToRpc`: Returns a mock object with stubbed `getData` and `getContext` methods.
     * - `switchToWs`: Returns a mock object with stubbed `getData`, `getClient`, and `getPattern` methods.
     *
     * Useful for simulating the behavior of `ArgumentsHost` in exception filters and other NestJS constructs during testing.
     */
    const mockArgumentsHost: ArgumentsHost = {
      switchToHttp: mockHttpArgumentsHost,
      getArgByIndex: function <T = unknown>(index: number): T {
        return undefined as T;
      },
      getArgs: function <T extends unknown[] = unknown[]>(): T {
        return [] as T;
      },
      getType: function <
        TContext extends string = 'http' | 'rpc' | 'ws' | 'graphql',
      >(): TContext {
        return 'http' as TContext;
      },
      switchToRpc: jest.fn(() => ({
        getData: jest.fn(),
        getContext: jest.fn(),
      })),
      switchToWs: jest.fn(() => ({
        getData: jest.fn(),
        getClient: jest.fn(),
        getPattern: jest.fn(),
      })),
    };
    // Call the filter's catch method with the mocked exception and arguments host
    filter.catch(exception, mockArgumentsHost);
    // Assert that the response was set with the correct status and message
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Test Exception',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should sanitize sensitive messages in production', () => {
    const exception = new HttpException(
      'Internal database error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    const mockGetResponse = jest
      .fn()
      .mockImplementation(() => ({ status: mockStatus }));
    /**
     * Mocks the behavior of a request object for testing purposes.
     *
     * This mock function simulates an HTTP request with predefined properties:
     * - `url`: The request URL (`/test`).
     * - `method`: The HTTP method used (`POST`).
     * - `ip`: The IP address of the requester (`127.0.0.1`).
     * - `headers`: An object containing request headers (with `'user-agent': 'jest'`).
     *
     * @returns An object representing a mock HTTP request.
     */
    const mockGetRequest = jest.fn().mockImplementation(() => ({
      url: '/test',
      method: 'POST',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    }));
    const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
      getNext: jest.fn(),
    }));
    const mockArgumentsHost = {
      switchToHttp: mockHttpArgumentsHost,
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };

    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    filter.catch(exception, mockArgumentsHost);

    process.env.NODE_ENV = originalNodeEnv;

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should include request context in logs', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    const mockGetResponse = jest
      .fn()
      .mockImplementation(() => ({ status: mockStatus }));
    const mockGetRequest = jest.fn().mockImplementation(() => ({
      url: '/not-found',
      method: 'GET',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    }));
    const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
      getNext: jest.fn(),
    }));
    /**
     * Mock implementation of the `ArgumentsHost` interface used for testing purposes.
     *
     * This mock object provides stubbed methods to simulate the behavior of NestJS's `ArgumentsHost`,
     * allowing for controlled testing of exception filters and other components that depend on the host context.
     *
     * @property switchToHttp - Mocked method to simulate switching to HTTP context.
     * @property getArgByIndex - Jest mock function to retrieve an argument by index.
     * @property getArgs - Jest mock function to retrieve all arguments.
     * @property getType - Jest mock function to retrieve the type of the context.
     * @property switchToRpc - Mocked method to simulate switching to RPC context.
     * @property switchToWs - Mocked method to simulate switching to WebSocket context.
     */
    const mockArgumentsHost = {
      switchToHttp: mockHttpArgumentsHost,
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    filter.catch(exception, mockArgumentsHost);

    expect(loggerSpy).toHaveBeenCalledWith(
      `HTTP ${HttpStatus.NOT_FOUND} - Not Found`,
      {
        method: 'GET',
        path: '/not-found',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        userAgent: 'jest',
      },
    );
  });

  it('should log not found errors with warn level', () => {
    // This test checks that 404 errors are logged with warn level
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    // The following function signatures are required to satisfy strict linter and type checks
    function statusFn(): { json: () => void } {
      return { json: (): void => {} };
    }
    const mockArgumentsHost: ArgumentsHost = {
      switchToHttp: () => ({
        getRequest: function <T = unknown>(): T {
          // Return a fake request object with required properties
          return {
            url: '/not-found',
            method: 'GET',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'jest' },
          } as T;
        },
        getResponse: function <T = unknown>(): T {
          // Return a fake response object with a status method
          return { status: statusFn } as T;
        },
        getNext: function <T = unknown>(): T {
          // Return undefined as required by the interface
          return undefined as T;
        },
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
    // Call the filter's catch method and check that the logger was called with the expected arguments
    filter.catch(exception, mockArgumentsHost);
    expect(loggerSpy).toHaveBeenCalledWith(
      `HTTP ${HttpStatus.NOT_FOUND} - Not Found`,
      {
        method: 'GET',
        path: '/not-found',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        userAgent: 'jest',
      },
    );
  });

  it('should use error level for 5xx errors', () => {
    // This test checks that 5xx errors are logged with error level
    const exception = new HttpException(
      'Internal Server Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    // The following function signatures are required to satisfy strict linter and type checks
    function statusFn2(): { json: () => void } {
      return { json: (): void => {} };
    }
    const mockArgumentsHost: ArgumentsHost = {
      switchToHttp: () => ({
        getRequest: function <T = unknown>(): T {
          // Return a fake request object with required properties
          return {
            url: '/error',
            method: 'GET',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'jest' },
          } as T;
        },
        getResponse: function <T = unknown>(): T {
          // Return a fake response object with a status method
          return { status: statusFn2 } as T;
        },
        getNext: function <T = unknown>(): T {
          // Return undefined as required by the interface
          return undefined as T;
        },
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
    // Call the filter's catch method and check that the logger was called with the expected arguments
    filter.catch(exception, mockArgumentsHost);
    expect(loggerSpy).toHaveBeenCalledWith(
      `HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} - Internal Server Error`,
      {
        method: 'GET',
        path: '/error',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        userAgent: 'jest',
      },
      expect.any(String), // Accept any stack trace as the third argument
    );
  });
});
