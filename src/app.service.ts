import { Injectable } from '@nestjs/common';
import * as packageJson from '../package.json';

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
      // You can add more system info here if needed
    };
  }
}
