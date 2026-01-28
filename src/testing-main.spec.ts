describe('testing entrypoint', () => {
  let dotenvConfig: jest.Mock;
  let bootstrap: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    dotenvConfig = jest.fn();
    bootstrap = jest.fn();
    jest.doMock('dotenv', () => ({ config: dotenvConfig }));
    jest.doMock('./bootstrap', () => ({ bootstrap }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('loads .test.env and delegates to bootstrap with test options', async () => {
    const { startTest } = await import('./testing-main');

    await startTest();

    expect(dotenvConfig).toHaveBeenCalledWith({ path: '.test.env' });
    expect(bootstrap).toHaveBeenCalledWith({
      bufferLogs: false,
      host: '127.0.0.1',
    });
  });
});
