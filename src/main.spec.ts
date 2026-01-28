describe('main entrypoint', () => {
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

  it('loads .env and delegates to bootstrap', async () => {
    const { start } = await import('./main');

    await start();

    expect(dotenvConfig).toHaveBeenCalledWith({ path: '.env' });
    expect(bootstrap).toHaveBeenCalledWith();
  });
});
