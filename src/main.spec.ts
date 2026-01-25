const nestFactoryCreate = jest.fn();
const dotenvConfig = jest.fn();
const jsonMiddleware = jest.fn();
const json = jest.fn(() => jsonMiddleware);

class Logger {}
class LoggerErrorInterceptor {}
class AppModule {}
class ConfigService {}

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: nestFactoryCreate },
}));
jest.mock('dotenv', () => ({
  config: dotenvConfig,
}));
jest.mock('express', () => ({ json }));
jest.mock('nestjs-pino', () => ({
  Logger,
  LoggerErrorInterceptor,
}));
jest.mock('./app.module', () => ({
  AppModule,
}));
jest.mock('./config/config.service', () => ({
  ConfigService,
}));

describe('main bootstrap', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  type LoadMainResult = {
    app: {
      useLogger: jest.Mock;
      useGlobalInterceptors: jest.Mock;
      getHttpAdapter: jest.Mock;
      get: jest.Mock;
      use: jest.Mock;
      listen: jest.Mock;
    };
    configService: {
      getGlobalPayloadLimit: jest.Mock;
      get: jest.Mock;
    };
    expressInstance: {
      set: jest.Mock;
    };
    loggerInstance: {
      log: jest.Mock;
    };
  };

  const loadMain = async ({
    nodeEnv,
    e2eTesting,
  }: {
    nodeEnv?: string;
    e2eTesting?: string;
  }): Promise<LoadMainResult> => {
    process.env = {
      ...originalEnv,
      NODE_ENV: nodeEnv,
      E2E_TESTING: e2eTesting,
    };

    const loggerInstance = { log: jest.fn() };
    const expressInstance = { set: jest.fn() };
    const configService = {
      getGlobalPayloadLimit: jest.fn(() => '1mb'),
      get: jest.fn((key: string) => {
        if (key === 'PORT') {
          return '3030';
        }
        return undefined;
      }),
    };

    const httpAdapter = {
      getInstance: (): { set: jest.Mock } => expressInstance,
    };

    const tokenLookup = new Map<unknown, unknown>([
      [Logger, loggerInstance],
      [ConfigService, configService],
    ]);

    const app = {
      useLogger: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      getHttpAdapter: jest.fn(() => httpAdapter),
      get: jest.fn((token: unknown) => tokenLookup.get(token)),
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    nestFactoryCreate.mockResolvedValue(app);

    const { bootstrap } = await import('./main');
    await bootstrap();

    return {
      app,
      configService,
      expressInstance,
      loggerInstance,
    };
  };

  it('bootstraps in test mode with E2E settings', async () => {
    const { app, configService, expressInstance, loggerInstance } =
      await loadMain({ nodeEnv: 'test', e2eTesting: 'true' });

    expect(dotenvConfig).toHaveBeenCalledWith({ path: '.test.env' });
    expect(nestFactoryCreate).toHaveBeenCalledWith(expect.any(Function), {
      bufferLogs: false,
    });
    expect(app.useLogger).toHaveBeenCalledWith(loggerInstance);
    expect(app.useGlobalInterceptors).toHaveBeenCalledWith(
      expect.any(LoggerErrorInterceptor),
    );
    expect(expressInstance.set).toHaveBeenCalledWith(
      'query parser',
      'extended',
    );
    expect(configService.getGlobalPayloadLimit).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ limit: '1mb' });
    expect(app.use).toHaveBeenCalledWith(jsonMiddleware);
    expect(app.listen).toHaveBeenCalledWith('3030', '0.0.0.0');
  });

  it('bootstraps with default environment settings', async () => {
    const { app } = await loadMain({
      nodeEnv: 'production',
      e2eTesting: 'false',
    });

    expect(dotenvConfig).toHaveBeenCalledWith({ path: '.env' });
    expect(nestFactoryCreate).toHaveBeenCalledWith(expect.any(Function), {
      bufferLogs: true,
    });
    expect(app.listen).toHaveBeenCalledWith('3030', '0.0.0.0');
  });
});
