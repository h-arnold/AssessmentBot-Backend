import * as packageJson from '../../package.json';

describe('StatusService', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns the expected greeting', async () => {
    await jest.unstable_mockModule('os', () => ({
      platform: jest.fn(),
      arch: jest.fn(),
      release: jest.fn(),
      uptime: jest.fn(),
      hostname: jest.fn(),
      totalmem: jest.fn(),
      freemem: jest.fn(),
      cpus: jest.fn(),
    }));

    const { StatusService } = await import('./status.service');
    const service = new StatusService();

    expect(service.getHello()).toBe('Hello World!');
  });

  it('returns system metrics and version details', async () => {
    const osMock = {
      platform: jest.fn(() => 'linux'),
      arch: jest.fn(() => 'x64'),
      release: jest.fn(() => '1.0.0'),
      uptime: jest.fn(() => 1234),
      hostname: jest.fn(() => 'test-host'),
      totalmem: jest.fn(() => 1024),
      freemem: jest.fn(() => 512),
      cpus: jest.fn(() => [{}, {}]),
    };

    await jest.unstable_mockModule('os', () => osMock);

    const fixedDate = new Date('2024-01-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(fixedDate);

    const { StatusService } = await import('./status.service');
    const service = new StatusService();

    const result = service.getHealth();

    expect(result).toEqual({
      status: 'ok',
      version: packageJson.version,
      timestamp: fixedDate.toISOString(),
      systemInfo: {
        platform: 'linux',
        arch: 'x64',
        release: '1.0.0',
        uptime: 1234,
        hostname: 'test-host',
        totalMemory: 1024,
        freeMemory: 512,
        cpus: 2,
      },
    });

    expect(osMock.platform).toHaveBeenCalled();
    expect(osMock.cpus).toHaveBeenCalled();
  });
});
