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

  it('runFromCli delegates to the provided start function', async () => {
    const { runFromCli } = await import('./testing-main');
    const startFn = jest.fn().mockResolvedValue(undefined);

    await runFromCli(startFn);

    expect(startFn).toHaveBeenCalledTimes(1);
  });

  it('runFromCli logs and exits when bootstrap fails', async () => {
    const { runFromCli } = await import('./testing-main');
    const startFn = jest.fn().mockRejectedValue(new Error('boom'));
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);

    await runFromCli(startFn);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to bootstrap test application:',
      expect.any(Error),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
