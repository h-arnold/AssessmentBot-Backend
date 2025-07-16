import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
process.env.NODE_ENV = 'test';
dotenv.config({ path: '.test.env' });
