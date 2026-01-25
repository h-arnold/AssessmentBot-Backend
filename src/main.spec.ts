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
    dotenvConfig: jest.Mock;
    expressInstance: {
      set: jest.Mock;
    };
    json: jest.Mock;
    jsonMiddleware: jest.Mock;
    loggerInstance: {
      log: jest.Mock;
    };
    nestFactoryCreate: jest.Mock;
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

    const dotenvConfig = jest.fn();
    const jsonMiddleware = jest.fn();
    const json = jest.fn(() => jsonMiddleware);
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

    const app = {
      useLogger: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      getHttpAdapter: jest.fn(() => httpAdapter),
      get: jest.fn((token: unknown) => {
        // eslint-disable-next-line security/detect-possible-timing-attacks
        if (token === Logger) {
          return loggerInstance;
        }
        // eslint-disable-next-line security/detect-possible-timing-attacks
        if (token === ConfigService) {
          return configService;
        }
        return undefined;
      }),
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    const nestFactoryCreate = jest.fn().mockResolvedValue(app);

    await jest.unstable_mockModule('@nestjs/core', () => ({
      NestFactory: { create: nestFactoryCreate },
    }));
    await jest.unstable_mockModule('dotenv', () => ({
      config: dotenvConfig,
    }));
    await jest.unstable_mockModule('express', () => ({ json }));
    await jest.unstable_mockModule('nestjs-pino', () => ({
      Logger,
      LoggerErrorInterceptor,
    }));
    await jest.unstable_mockModule('./app.module', () => ({
      AppModule: class AppModule {},
    }));
    await jest.unstable_mockModule('./config/config.service', () => ({
      ConfigService,
    }));

    await import('./main');

    return {
      app,
      configService,
      dotenvConfig,
      expressInstance,
      json,
      jsonMiddleware,
      loggerInstance,
      nestFactoryCreate,
    };
  };

  class Logger {}
  class LoggerErrorInterceptor {}
  class ConfigService {}

  it('bootstraps in test mode with E2E settings', async () => {
    const {
      app,
      configService,
      dotenvConfig,
      expressInstance,
      json,
      jsonMiddleware,
      loggerInstance,
      nestFactoryCreate,
    } = await loadMain({ nodeEnv: 'test', e2eTesting: 'true' });

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
    const { app, dotenvConfig, nestFactoryCreate } = await loadMain({
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
