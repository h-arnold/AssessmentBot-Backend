import { Test, TestingModule } from '@nestjs/testing';
import { AssessorModule } from './assessor.module';
import { AssessorController } from './assessor.controller';
import { AssessorService } from './assessor.service';

describe('AssessorModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AssessorModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide AssessorController', () => {
    const controller = module.get<AssessorController>(AssessorController);
    expect(controller).toBeDefined();
  });

  it('should provide AssessorService', () => {
    const service = module.get<AssessorService>(AssessorService);
    expect(service).toBeDefined();
  });
});