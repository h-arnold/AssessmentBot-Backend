const dotenvConfig = jest.fn();
const bootstrap = jest.fn();

jest.mock('dotenv', () => ({
  config: dotenvConfig,
}));
jest.mock('./bootstrap', () => ({
  bootstrap,
}));

describe('main entrypoint', () => {
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
