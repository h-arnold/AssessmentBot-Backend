import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
process.env.NODE_ENV = 'development';
dotenv.config({ path: '.test.env' });
