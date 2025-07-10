import { z } from 'zod';

/**
 * Defines the schema for a single assessment criterion.
 * - `score`: An integer between 0 and 5.
 * - `reasoning`: A non-empty string explaining the score.
 */
export const AssessmentCriterionSchema = z.object({
  score: z.number().int().min(0).max(5),
  reasoning: z.string().min(1),
});

/**
 * Defines the schema for the complete LLM assessment response.
 * It expects exactly three criteria: completeness, accuracy, and spag.
 */
export const LlmResponseSchema = z.object({
  completeness: AssessmentCriterionSchema,
  accuracy: AssessmentCriterionSchema,
  spag: AssessmentCriterionSchema,
});

/**
 * TypeScript type inferred from the LlmResponseSchema.
 */
export type LlmResponse = z.infer<typeof LlmResponseSchema>;
