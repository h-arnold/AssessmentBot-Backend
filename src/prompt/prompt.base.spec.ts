import { ZodError } from 'zod';

import { Prompt, PromptInput, PromptInputSchema } from './prompt.base';

// Mock implementation of the abstract class for testing
class TestPrompt extends Prompt {
  public async buildMessage(): Promise<string | object> {
    return 'test message';
  }
}

describe('Prompt Base Class', (): void => {
  const validInput: PromptInput = {
    referenceTask: 'This is the reference task.',
    studentTask: 'This is the student task.',
    emptyTask: 'This is the empty task.',
  };

  describe('PromptInputSchema', (): void => {
    it('should parse a valid input object successfully', (): void => {
      const result = (): PromptInput => PromptInputSchema.parse(validInput);
      expect(result).not.toThrow();
      expect(result()).toEqual(validInput);
    });

    it('should throw a ZodError if referenceTask is missing', (): void => {
      const invalidInput = { ...validInput, referenceTask: undefined };
      expect(() => PromptInputSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should throw a ZodError if studentTask is not a string', (): void => {
      const invalidInput = { ...validInput, studentTask: 123 };
      expect(() => PromptInputSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should throw a ZodError if emptyTask is missing', (): void => {
      const invalidInput = { ...validInput, emptyTask: undefined };
      expect(() => PromptInputSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should accept empty strings as valid input', (): void => {
      const emptyInput: PromptInput = {
        referenceTask: '',
        studentTask: '',
        emptyTask: '',
      };
      const result = (): PromptInput => PromptInputSchema.parse(emptyInput);
      expect(result).not.toThrow();
      expect(result()).toEqual(emptyInput);
    });
  });

  describe('Prompt Constructor', (): void => {
    it('should instantiate and assign properties with valid input', (): void => {
      const prompt = new TestPrompt(validInput);
      expect(prompt).toBeInstanceOf(TestPrompt);
      // We can't directly access protected members, but we know the schema passed.
    });

    it('should throw a ZodError via the constructor with invalid input', (): void => {
      const invalidInput = { ...validInput, studentTask: false };
      expect(() => new TestPrompt(invalidInput)).toThrow(ZodError);
    });
  });
});
