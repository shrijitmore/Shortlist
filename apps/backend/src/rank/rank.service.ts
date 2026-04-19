import { Injectable, Logger } from '@nestjs/common';
import { Car, ParsedIntake, RankedCar, ShortlistResult } from '../common/types';
import { GeminiService } from '../ai/gemini.service';
import { AiRankResultSchema } from '../common/schemas';
import { ConstantsService } from '../constants/constants.service';

@Injectable()
export class RankService {
  private readonly logger = new Logger(RankService.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly constants: ConstantsService,
  ) {}

  async rank(candidates: Car[], parsed: ParsedIntake, clarifierAnswer: string, rawInput: string): Promise<ShortlistResult> {
    const t0 = Date.now();
    this.logger.log(`Ranking ${candidates.length} candidates`);

    const topPick = candidates[0];

    let altCar: Car | undefined;
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].segment !== candidates[0].segment || candidates[i].fuel_type !== candidates[0].fuel_type) {
        altCar = candidates[i];
        break;
      }
    }
    if (!altCar) altCar = candidates[1];

    const surpriseCar = this.findSurprise(candidates, topPick, altCar, parsed);
    this.logger.log(
      `Pre-selected — top=${topPick.brand} ${topPick.model} alt=${altCar.brand} ${altCar.model} surprise=${surpriseCar.brand} ${surpriseCar.model}`
    );

    const picks = [
      { car: topPick, rankType: 'topPick' as const },
      { car: altCar, rankType: 'alternative' as const },
      { car: surpriseCar, rankType: 'surprise' as const },
    ];

    if (!this.gemini.isFallback()) {
      this.logger.log('Dispatching AI rationale generation');
      try {
        const result = await this.aiRank(picks, parsed, clarifierAnswer, rawInput);
        this.logger.log(`AI ranking complete (${Date.now() - t0}ms)`);
        return result;
      } catch (e) {
        this.logger.error('LangChain ranking failed, falling back to deterministic.', e);
      }
    }

    return {
      topPick: this.buildRankedCar(topPick, 'topPick', parsed, clarifierAnswer),
      alternative: this.buildRankedCar(altCar, 'alternative', parsed, clarifierAnswer),
      surprise: this.buildRankedCar(surpriseCar, 'surprise', parsed, clarifierAnswer),
    };
  }

  private async aiRank(
    picks: { car: Car; rankType: RankedCar['rankType'] }[],
    parsed: ParsedIntake,
    clarifierAnswer: string,
    rawInput: string,
  ): Promise<ShortlistResult> {
    const model = this.gemini.getModel();
    const modelWithStructuredOutput = model.withStructuredOutput(AiRankResultSchema, {
      name: "rank_result",
    });

    const carsContext: object[] = [];
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      carsContext.push({
        index: i,
        rankType: p.rankType,
        brand: p.car.brand,
        model: p.car.model,
        variant: p.car.variant,
        priceRange: `${p.car.price_min_lakh}-${p.car.price_max_lakh}L`,
        fuelType: p.car.fuel_type,
        transmission: p.car.transmission,
        seating: p.car.seating,
        lengthMm: p.car.length_mm,
        mileageKmpl: p.car.mileage_kmpl,
        safetyRating: p.car.safety_rating,
        segment: p.car.segment,
      });
    }

    const prompt = `
You are a senior automotive journalist writing for Indian car buyers.
Given a user's situation and 3 pre-selected cars (topPick, alternative, surprise), write personalised card text for each.

RULES:
- "becauseYouSaid" MUST quote or closely paraphrase the user's OWN words from their input — never generic.
- "rationale" must explain WHY this specific car suits THIS user's life, not generic praise.
- "tradeoff" must be an honest caveat or downside the buyer should know.
- Keep each field to 1-2 sentences max.
- Do NOT hallucinate specs outside what is provided.
- For the surprise pick, explain why they should consider something they didn't ask for.
- ${this.constants.RANK_RULE_SPEC}
- ${this.constants.RANK_RULE_SOURCE}
- ${this.constants.RANK_RULE_OFFTOPIC}

USER INPUT: "${rawInput}"
CLARIFIER ANSWER: "${clarifierAnswer}"
PARSED PREFERENCES: ${JSON.stringify(parsed)}

CARS (in order — topPick, alternative, surprise):
${JSON.stringify(carsContext, null, 2)}

Return exactly 3 card objects in the "cards" array, in the same order.
`;

    const result = await modelWithStructuredOutput.invoke(prompt);
    const aiResult = result as { cards: Array<{ rationale: string; insight1: string; insight2: string; tradeoff: string; becauseYouSaid: string; source: RankedCar['source'] }> };

    if (!aiResult.cards || aiResult.cards.length !== 3) {
      throw new Error('LangChain returned invalid card count');
    }

    const ranked: RankedCar[] = [];
    for (let i = 0; i < picks.length; i++) {
      ranked.push({
        car: picks[i].car,
        rankType: picks[i].rankType,
        rationale: aiResult.cards[i].rationale,
        insight1: aiResult.cards[i].insight1,
        insight2: aiResult.cards[i].insight2,
        tradeoff: aiResult.cards[i].tradeoff,
        becauseYouSaid: aiResult.cards[i].becauseYouSaid,
        source: aiResult.cards[i].source,
      });
    }

    this.logger.log('AI rationale generation succeeded (aiRank).');
    return { topPick: ranked[0], alternative: ranked[1], surprise: ranked[2] };
  }

  private findSurprise(candidates: Car[], top: Car, alt: Car, parsed: ParsedIntake): Car {
    const usedIds = new Set([top.id, alt.id]);
    let unexpected: Car | undefined;

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (usedIds.has(c.id)) continue;
      if (c.fuel_type === 'electric' && !parsed.fuelConfusion) { unexpected = c; break; }
      if (c.fuel_type === 'hybrid') { unexpected = c; break; }
      if (top.segment.includes('suv') && c.segment === 'sedan') { unexpected = c; break; }
      if (top.segment === 'hatchback' && c.segment.includes('suv')) { unexpected = c; break; }
    }

    if (unexpected) return unexpected;

    for (let i = 0; i < candidates.length; i++) {
      if (!usedIds.has(candidates[i].id)) return candidates[i];
    }
    return candidates[2] || candidates[0];
  }

  // ── Deterministic fallback ──────────────────────────────────────────────

  private buildRankedCar(car: Car, rankType: RankedCar['rankType'], parsed: ParsedIntake, answer: string): RankedCar {
    const rationale = this.buildRationale(car, parsed, rankType);
    const [insight1, insight2] = this.buildInsights(car, parsed);
    const tradeoff = this.buildTradeoff(car, rankType);
    const becauseYouSaid = this.buildBecauseYouSaid(car, parsed, answer);
    const source = this.buildSource(car, rankType);

    return { car, rankType, rationale, insight1, insight2, tradeoff, becauseYouSaid, source };
  }

  private buildSource(car: Car, rankType: RankedCar['rankType']): RankedCar['source'] {
    if (car.safety_rating >= 5) return 'Bharat NCAP';
    if (car.fuel_type === 'hybrid' || car.fuel_type === 'electric') return 'Team-BHP';
    if (rankType === 'surprise') return 'Team-BHP';
    if (car.mileage_kmpl >= 20) return 'Autocar India';
    return 'CarDekho reviews';
  }

  private buildRationale(car: Car, parsed: ParsedIntake, rankType: RankedCar['rankType']): string {
    const city = parsed.city || 'your city';
    if (rankType === 'topPick') {
      if (parsed.parkingConcern) return `${car.brand} ${car.model} checks every box — compact enough to park easily in ${city}, yet roomy for a family of ${parsed.familySize || 4}.`;
      if (parsed.priorities.includes('safety')) return `Top NCAP scorer within your budget — ${car.brand} ${car.model} is the safest bet in its class.`;
      return `The most balanced choice for a family of ${parsed.familySize || 4} in ${city} at ₹${parsed.budget || car.price_min_lakh}L.`;
    }
    if (rankType === 'alternative') {
      return `If you want to explore beyond the obvious, ${car.brand} ${car.model} offers ${car.fuel_type} efficiency with a distinct character.`;
    }
    if (car.fuel_type === 'electric') return `Bold pick: the ${car.brand} ${car.model} EV has near-zero running costs — worth considering if charging is available.`;
    if (car.fuel_type === 'hybrid') return `The ${car.brand} ${car.model} hybrid gives you petrol convenience with EV frugality — no charging anxiety.`;
    return `Left-field recommendation: ${car.brand} ${car.model} surprises with ${car.segment} practicality at this price.`;
  }

  private buildInsights(car: Car, parsed: ParsedIntake): [string, string] {
    const fuelLabel = { petrol: 'Petrol', diesel: 'Diesel', electric: 'Electric', cng: 'CNG', hybrid: 'Hybrid' }[car.fuel_type] ?? car.fuel_type;
    const mileageInsight = car.fuel_type === 'electric'
      ? 'Approx. 300-400 km real-world range per charge'
      : `${car.mileage_kmpl} kmpl real-world ${fuelLabel} mileage`;

    const safetyInsight = car.safety_rating >= 4
      ? `${car.safety_rating}-star Global NCAP safety rating`
      : `${car.seating}-seater with comfortable cabin for families`;

    if (parsed.priorities.includes('mileage')) return [mileageInsight, safetyInsight];
    if (parsed.priorities.includes('safety')) return [safetyInsight, mileageInsight];

    return [mileageInsight, safetyInsight];
  }

  private buildTradeoff(car: Car, rankType: RankedCar['rankType']): string {
    if (car.fuel_type === 'electric') return 'Charging infrastructure in smaller cities is still patchy — verify home charging feasibility.';
    if (car.fuel_type === 'diesel') return 'Higher upfront cost; worth it only if you drive 2,000+ km/month.';
    if (car.fuel_type === 'hybrid') return 'Hybrid premium is ₹1.5-2L over petrol; payback takes ~3 years on typical usage.';
    if (car.transmission === 'amt') return 'AMT can feel jerky in stop-start city traffic compared to a torque-converter automatic.';
    if (car.segment === 'sedan') return 'Sedans have smaller ground clearance — speed-breakers on bad roads need care.';
    if (rankType === 'surprise') return 'Thinking outside your initial brief — worth a test drive before committing.';
    return 'Waitlists at dealerships can be 4-8 weeks for popular variants.';
  }

  private buildBecauseYouSaid(car: Car, parsed: ParsedIntake, answer: string): string {
    const ans = answer.toLowerCase();
    if (parsed.parkingConcern && car.length_mm <= 4200) return 'Because you said parking feels scary — at ' + car.length_mm + 'mm, this is one of the easier cars to slot in.';
    if (ans.includes('safety') && car.safety_rating >= 4.5) return 'Because you prioritised safety — ' + car.safety_rating + ' NCAP stars is best-in-class here.';
    if (ans.includes('petrol') && car.fuel_type === 'petrol') return 'Because you chose petrol — low maintenance, easy to refuel anywhere.';
    if (ans.includes('ev') && car.fuel_type === 'electric') return 'Because you\'re open to EV — this one has the best real-world range in budget.';
    if (parsed.priorities.includes('mileage')) return `Because you care about running costs — at ${car.mileage_kmpl} kmpl, monthly fuel bill stays lean.`;
    if (parsed.familySize && car.seating >= parsed.familySize) return `Because you're a family of ${parsed.familySize} — ${car.seating} seats with proper headroom for adults.`;
    return `Because ${car.brand} ${car.model} scored highest for your specific combination of needs.`;
  }
}
