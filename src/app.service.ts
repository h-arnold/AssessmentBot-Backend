import { Injectable } from '@nestjs/common';
import * as packageJson from '../package.json';
import * as os from 'os';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth() {
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
