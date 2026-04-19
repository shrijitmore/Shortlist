// apps/backend/src/common/dto.ts — request & response DTO contracts for all endpoints
import { ParsedIntake, ClarifyQuestion, ShortlistResult } from './types';

// ── Generic envelope ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── Request DTOs (mirrors Zod schemas — used for controller signatures) ───────

export interface IntakeRequestDto {
  text: string;
}

export interface ClarifyRequestDto {
  requestId: string;
}

export interface ShortlistRequestDto {
  requestId: string;
  answer: string;
}

export interface CompareRequestDto {
  requestId: string;
}

// ── Response data DTOs ────────────────────────────────────────────────────────

export interface IntakeResponseData {
  requestId: string;
  parsed: ParsedIntake;
  step: 'clarify';
}

export interface ClarifyResponseData {
  question: string;
  options: string[];
  dimension: string;
}

export interface NextQuestionDto {
  question: string;
  options: string[];
  dimension: string;
  questionNumber: number;
}

export interface ShortlistResponseData {
  needsMoreClarification: boolean;
  nextQuestion: NextQuestionDto | null;
  shortlist: ShortlistResult | null;
}

export interface CompareResponseData {
  verdict: string;
}

// ── Convenience aliases ───────────────────────────────────────────────────────

export type IntakeResponse   = ApiResponse<IntakeResponseData>;
export type ClarifyResponse  = ApiResponse<ClarifyResponseData>;
export type ShortlistResponse = ApiResponse<ShortlistResponseData>;
export type CompareResponse  = ApiResponse<CompareResponseData>;
