import { IncomingMessage, ServerResponse } from 'http';

import { ConfigService } from './config/config.service';

const forRootAsync = jest.fn();

jest.mock('nestjs-pino', () => ({
  LoggerModule: { forRootAsync },
}));

describe('AppModule logging configuration', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  const loadModule = async (): Promise<{ AppModule: unknown }> => {
    jest.resetModules();
    forRootAsync.mockClear();
    return import('./app.module');
  };

  const buildConfigService = (
    overrides: Partial<Record<string, string>>,
  ): { get: jest.Mock } => ({
    get: jest.fn((key: string) => {
      const defaults: Record<string, string> = {
        LOG_LEVEL: 'debug',
        NODE_ENV: 'development',
        ...overrides,
      };
      return defaults[key];
    }),
  });

  it('uses the file transport when LOG_FILE is set', async () => {
    process.env = { ...originalEnv, LOG_FILE: '/tmp/app.log' };

    const module = await loadModule();
    expect(module.AppModule).toBeDefined();
    expect(forRootAsync).toHaveBeenCalledTimes(1);

    const options = forRootAsync.mock.calls[0][0];
    const configService = buildConfigService({ NODE_ENV: 'production' });
    const result = options.useFactory(
      configService as unknown as ConfigService,
    );

    expect(result.pinoHttp.transport).toEqual({
      target: 'pino/file',
      options: { destination: '/tmp/app.log' },
    });

    const reqWithId = { id: 'abc-123' } as IncomingMessage;
    const reqWithoutId = {} as IncomingMessage;
    const customProps = result.pinoHttp.customProps as (
      req: IncomingMessage,
      res: ServerResponse<IncomingMessage>,
    ) => { reqId: string | number | undefined };

    expect(
      customProps(reqWithId, {} as ServerResponse<IncomingMessage>),
    ).toEqual({
      reqId: 'abc-123',
    });
    expect(
      customProps(reqWithoutId, {} as ServerResponse<IncomingMessage>),
    ).toEqual({
      reqId: undefined,
    });
  });

  it('uses JSON logging without transport in production', async () => {
    process.env = { ...originalEnv };

    await loadModule();
    const options = forRootAsync.mock.calls[0][0];
    const configService = buildConfigService({ NODE_ENV: 'production' });
    const result = options.useFactory(
      configService as unknown as ConfigService,
    );

    expect(result.pinoHttp.level).toBe('debug');
    expect(result.pinoHttp.transport).toBeUndefined();
  });

  it('uses pino-pretty transport in development', async () => {
    process.env = { ...originalEnv };

    await loadModule();
    const options = forRootAsync.mock.calls[0][0];
    const configService = buildConfigService({ NODE_ENV: 'development' });
    const result = options.useFactory(
      configService as unknown as ConfigService,
    );

    expect(result.pinoHttp.transport).toEqual({
      target: 'pino-pretty',
      options: { singleLine: true },
    });
  });
});
