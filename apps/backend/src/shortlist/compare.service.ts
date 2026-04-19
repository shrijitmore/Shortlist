import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { ShortlistResult } from '../common/types';
import { VerdictSchema } from '../common/schemas';

@Injectable()
export class CompareService {
  private readonly logger = new Logger(CompareService.name);

  constructor(private readonly gemini: GeminiService) {}

  async compare(shortlist: ShortlistResult, rawInput: string): Promise<string> {
    if (this.gemini.isFallback()) {
      this.logger.warn('Using fallback compare verdict.');
      return this.fallbackCompare(shortlist);
    }

    const cars = [shortlist.topPick, shortlist.alternative, shortlist.surprise];
    const carSummaries: string[] = [];
    for (let i = 0; i < cars.length; i++) {
      const rc = cars[i];
      carSummaries.push(
        `${rc.rankType}: ${rc.car.brand} ${rc.car.model} (${rc.car.fuel_type}, ₹${rc.car.price_min_lakh}-${rc.car.price_max_lakh}L, ${rc.car.safety_rating}-star, ${rc.car.mileage_kmpl} kmpl, ${rc.car.segment})`
      );
    }

    const prompt = `
You are a trusted car-buying advisor for Indian buyers.
The user described their needs, and we shortlisted 3 cars. Now give a final synthesized verdict comparing all three.

RULES:
- 3-4 sentences max.
- Reference the user's situation and how each car addresses it differently.
- End with a clear recommendation of which one to test-drive first and why.
- Do NOT hallucinate specs — use only what is provided.
- Be honest about tradeoffs.

USER INPUT: "${rawInput}"

SHORTLISTED CARS:
${carSummaries.join('\n')}

TOP PICK RATIONALE: ${shortlist.topPick.rationale}
ALTERNATIVE RATIONALE: ${shortlist.alternative.rationale}
SURPRISE RATIONALE: ${shortlist.surprise.rationale}
`;

    try {
      const model = this.gemini.getModel();
      const modelWithStructuredOutput = model.withStructuredOutput(VerdictSchema, {
        name: "compare_verdict",
      });

      const result = await modelWithStructuredOutput.invoke(prompt);
      const parsed = result as { verdict: string };
      this.logger.log('AI compare verdict generated.');
      return parsed.verdict;
    } catch (e) {
      this.logger.error('LangChain compare failed, falling back.', e);
      return this.fallbackCompare(shortlist);
    }
  }

  private fallbackCompare(shortlist: ShortlistResult): string {
    const top = shortlist.topPick.car;
    const alt = shortlist.alternative.car;
    const sur = shortlist.surprise.car;

    return `Your top pick, the ${top.brand} ${top.model}, offers the best overall balance for your needs. ` +
      `The ${alt.brand} ${alt.model} is a solid alternative if you value ${alt.fuel_type} efficiency. ` +
      `The ${sur.brand} ${sur.model} is worth a test drive if you're open to something different. ` +
      `We'd recommend starting with the ${top.brand} ${top.model} at your nearest dealership.`;
  }
}
