import { HttpException, HttpStatus, Logger } from '@nestjs/common';
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
    const exception = new HttpException('Test Exception', HttpStatus.BAD_REQUEST);
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockImplementation(() => ({
      json: mockJson,
    }));
    const mockGetResponse = jest.fn().mockImplementation(() => ({
      status: mockStatus,
    }));
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

    filter.catch(exception, mockArgumentsHost as any);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Test Exception',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should sanitize sensitive messages in production', () => {
    const exception = new HttpException('Internal database error', HttpStatus.INTERNAL_SERVER_ERROR);
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    const mockGetResponse = jest.fn().mockImplementation(() => ({ status: mockStatus }));
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

    filter.catch(exception, mockArgumentsHost as any);

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
    const mockGetResponse = jest.fn().mockImplementation(() => ({ status: mockStatus }));
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
    const mockArgumentsHost = {
      switchToHttp: mockHttpArgumentsHost,
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    filter.catch(exception, mockArgumentsHost as any);

    expect(loggerSpy).toHaveBeenCalledWith(
      `[HTTP Exception] GET /not-found`,
      JSON.stringify({
        statusCode: HttpStatus.NOT_FOUND,
        path: '/not-found',
        method: 'GET',
        ip: '127.0.0.1',
        userAgent: 'jest',
        stack: exception.stack,
      }),
    );
  });

  it('should use warn level for 4xx errors', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const mockArgumentsHost = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/not-found', method: 'GET', ip: '127.0.0.1', headers: { 'user-agent': 'jest' } }),
        getResponse: () => ({ status: () => ({ json: () => {} }) }),
        getNext: () => {},
      }),
    } as any;

    filter.catch(exception, mockArgumentsHost);

    expect(loggerSpy).toHaveBeenCalledWith(
      `[HTTP Exception] GET /not-found`,
      JSON.stringify({
        statusCode: HttpStatus.NOT_FOUND,
        path: '/not-found',
        method: 'GET',
        ip: '127.0.0.1',
        userAgent: 'jest',
        stack: exception.stack,
      }),
    );
  });

  it('should use error level for 5xx errors', () => {
    const exception = new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const mockArgumentsHost = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/error', method: 'GET', ip: '127.0.0.1', headers: { 'user-agent': 'jest' } }),
        getResponse: () => ({ status: () => ({ json: () => {} }) }),
        getNext: () => {},
      }),
    } as any;

    filter.catch(exception, mockArgumentsHost);

    expect(loggerSpy).toHaveBeenCalledWith(
      `[HTTP Exception] GET /error`,
      JSON.stringify({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/error',
        method: 'GET',
        ip: '127.0.0.1',
        userAgent: 'jest',
        stack: exception.stack,
      }),
    );
  });
});
