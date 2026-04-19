import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ParsedIntake, ClarifyQuestion, ClarifyHistoryItem } from '../common/types';
import { GeminiService } from '../ai/gemini.service';
import { ClarifyQuestionSchema, ClarifyDecisionSchema } from '../common/schemas';
import { ConstantsService } from '../constants/constants.service';

@Injectable()
export class ClarifyService {
  private readonly logger = new Logger(ClarifyService.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly constants: ConstantsService,
  ) {}

  async generate(parsed: ParsedIntake, rawText: string): Promise<ClarifyQuestion> {
    if (this.gemini.isFallback()) {
      this.logger.error('[ClarifyService.generate] AI service unavailable.');
      throw new Error(this.constants.ERR_AI_UNAVAILABLE);
    }

    this.logger.log('[ClarifyService.generate] Dispatching AI call for first clarify question.');
    const model = this.gemini.getModel();
    const modelWithStructuredOutput = model.withStructuredOutput(ClarifyQuestionSchema, {
      name: 'clarify_question',
    });

    const prompt = `
      You are an expert car buying assistant in India.
      Review the user's raw input and our structured parsing of it.
      Identify the *single biggest missing piece of information* that would help recommend the perfect car.
      Common ambiguities to probe:
      - Do they prefer Petrol, Diesel, EV or Hybrid?
      - Do they prefer an SUV, Sedan, or Hatchback?
      - Are they heavily constrained by parking space?
      - What is their top priority if the budget is tight (safety/mileage/tech/resale)?
      - City driving vs highway trips?

      Output exactly one question, and exactly 3 or 4 clear, distinct multiple-choice options
      with short engaging text including emojis. Also specify a one-word dimension descriptor.

      USER INPUT: "${rawText}"
      PARSED DATA: ${JSON.stringify(parsed)}
    `;

    const result: z.infer<typeof ClarifyQuestionSchema> = await modelWithStructuredOutput.invoke(prompt);
    this.logger.log('[ClarifyService.generate] First clarify question generated.');
    return result;
  }

  async decideNext(
    parsed: ParsedIntake,
    rawText: string,
    history: ClarifyHistoryItem[],
  ): Promise<{ done: true } | { done: false; nextQuestion: ClarifyQuestion }> {
    if (this.gemini.isFallback()) {
      this.logger.error('[ClarifyService.decideNext] AI service unavailable.');
      throw new Error(this.constants.ERR_AI_UNAVAILABLE);
    }

    this.logger.log(`[ClarifyService.decideNext] Deciding after ${history.length} Q&A pairs.`);

    const model = this.gemini.getModel();
    const modelWithStructuredOutput = model.withStructuredOutput(ClarifyDecisionSchema, {
      name: 'clarify_decision',
    });

    let historyText = '';
    for (let i = 0; i < history.length; i++) {
      historyText += `Q${i + 1}: ${history[i].question}\nAnswer: ${history[i].answer}\n\n`;
    }

    const coveredDims: string[] = [];
    for (let i = 0; i < history.length; i++) coveredDims.push(history[i].dimension);
    const coveredDimsStr = coveredDims.join(', ') || 'none';

    const prompt = `
      You are an expert car buying assistant in India.

      A user has described their car needs and you have been asking clarifying questions.
      Review the full conversation and decide:

      1. If you have ENOUGH information to recommend the perfect car → set done: true
      2. If ONE more targeted question would meaningfully change the recommendation → set done: false and provide nextQuestion

      Dimensions already covered: ${coveredDimsStr}

      Key gaps worth probing (only if NOT already covered and still ambiguous):
      - fuel: Petrol / Diesel / EV / Hybrid preference
      - bodyStyle: SUV / Sedan / Hatchback preference
      - parking: tight parking constraints
      - priority: top priority when budget is tight (safety/mileage/tech/resale)
      - usage: city vs highway split

      Rules:
      - Do NOT ask about a dimension already covered.
      - If all critical gaps are filled, or the remaining gaps are marginal, set done: true.
      - nextQuestion must have exactly 3–4 short, emoji-rich options.
      - nextQuestion.dimension must be a single lowercase word.

      USER INPUT: "${rawText}"
      PARSED DATA: ${JSON.stringify(parsed)}

      CONVERSATION SO FAR:
      ${historyText}
    `;

    try {
      const result: z.infer<typeof ClarifyDecisionSchema> = await modelWithStructuredOutput.invoke(prompt);
      this.logger.log(`[ClarifyService.decideNext] AI decision: done=${result.done}`);

      if (result.done || !result.nextQuestion) {
        return { done: true };
      }
      return { done: false, nextQuestion: result.nextQuestion };
    } catch (e) {
      this.logger.error('[ClarifyService.decideNext] AI call failed, proceeding with collected context.', e);
      return { done: true };
    }
  }
}
