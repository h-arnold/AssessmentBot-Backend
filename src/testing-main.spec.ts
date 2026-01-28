const dotenvConfig = jest.fn();
const bootstrap = jest.fn();

jest.mock('dotenv', () => ({
  config: dotenvConfig,
}));
jest.mock('./bootstrap', () => ({
  bootstrap,
}));

describe('testing entrypoint', () => {
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
