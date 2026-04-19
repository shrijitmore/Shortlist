// apps/backend/src/common/schemas.ts
import { z } from 'zod';

export const IntakeRequestSchema = z.object({
  text: z.string().min(10, 'Please describe your situation in a bit more detail').max(2000),
});
export type IntakeRequest = z.infer<typeof IntakeRequestSchema>;

export const ClarifyRequestSchema = z.object({
  requestId: z.string().uuid(),
});
export type ClarifyRequest = z.infer<typeof ClarifyRequestSchema>;

export const ShortlistRequestSchema = z.object({
  requestId: z.string().uuid(),
  answer: z.string().min(1),
});
export type ShortlistRequest = z.infer<typeof ShortlistRequestSchema>;

export const CompareRequestSchema = z.object({
  requestId: z.string().uuid(),
});
export type CompareRequest = z.infer<typeof CompareRequestSchema>;

// Output Schemas for AI
export const ParsedIntakeSchema = z.object({
  budget: z.number().nullable(),
  city: z.string().nullable(),
  familySize: z.number().nullable(),
  monthlyKm: z.number().nullable(),
  cityVsHighway: z.enum(['city', 'highway', 'mixed']).nullable(),
  parkingConcern: z.boolean(),
  fuelConfusion: z.boolean(),
  priorities: z.array(z.string()),
  dealbreakers: z.array(z.string()),
});

export const ClarifyQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  dimension: z.string(),
});

export const SharedRankCardSchema = z.object({
  rationale: z.string(),
  insight1: z.string(),
  insight2: z.string(),
  tradeoff: z.string(),
  becauseYouSaid: z.string(),
});

export const AiRankResultSchema = z.object({
  cards: z.array(SharedRankCardSchema),
});

export const PersonaSchema = z.object({
  persona: z.string(),
});

export const VerdictSchema = z.object({
  verdict: z.string(),
});

export const ClarifyDecisionSchema = z.object({
  done: z.boolean(),
  nextQuestion: z.object({
    question: z.string(),
    options: z.array(z.string()),
    dimension: z.string(),
  }).optional(),
});
