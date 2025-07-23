import * as os from 'os';

import { Injectable } from '@nestjs/common';

import * as packageJson from '../../package.json';

interface SystemInfo {
  platform: string;
  arch: string;
  release: string;
  uptime: number;
  hostname: string;
  totalMemory: number;
  freeMemory: number;
  cpus: number;
}

export interface HealthCheckResponse {
  status: string;
  version: string;
  timestamp: string;
  systemInfo: SystemInfo;
}

@Injectable()
export class StatusService {
  getHello(): string {
    return 'Hello World!';
  }
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      version: packageJson.version,
      timestamp: new Date().toISOString(),
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        hostname: os.hostname(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus().length,
      },
    };
  }
}
