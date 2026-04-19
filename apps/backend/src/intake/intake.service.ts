import { Injectable, Logger } from '@nestjs/common';
import { ParsedIntake } from '../common/types';
import { GeminiService } from '../ai/gemini.service';
import { ParsedIntakeSchema } from '../common/schemas';

@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);

  constructor(private readonly gemini: GeminiService) {}

  async parse(text: string): Promise<ParsedIntake> {
    if (this.gemini.isFallback()) {
      this.logger.warn('Using fallback rule-based intake parser.');
      return this.fallbackParse(text);
    }

    try {
      const model = this.gemini.getModel();
      const modelWithStructuredOutput = model.withStructuredOutput(ParsedIntakeSchema, {
        name: "parsed_intake",
      });

      const prompt = `
        You are an expert automotive consultant in India.
        Read the following user paragraph expressing what type of car they want.
        Extract their specific details.
        If a detail is not mentioned at all, return null or an empty array appropriately.
        Ensure cityVsHighway is strictly 'city', 'highway', or 'mixed'.
        IMPORTANT: Return "budget" as a number in LAKHS (e.g., if user says "12 lakhs" return 12, if "₹15L" return 15, if "20 lakh" return 20). Never return rupees.

        USER INPUT:
        "${text}"
      `;

      const result = await modelWithStructuredOutput.invoke(prompt);
      return result as ParsedIntake;
    } catch (e) {
      this.logger.error('LangChain intake parse failed, falling back to rule-based.', e);
      return this.fallbackParse(text);
    }
  }

  private fallbackParse(text: string): ParsedIntake {
    const lower = text.toLowerCase();

    let budget: number | null = null;
    const budgetPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:lakh|l)\s*(?:otr|budget|max|under|below|upto)/i,
      /(?:budget|otr|max)\s*(?:is|of|around|about)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|l)/i,
      /(\d+(?:\.\d+)?)\s*(?:l\b|lakh)/i,
    ];
    for (let i = 0; i < budgetPatterns.length; i++) {
      const m = text.match(budgetPatterns[i]);
      if (m) {
        budget = parseFloat(m[1]);
        break;
      }
    }

    const indianCities = [
      'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai',
      'pune', 'kolkata', 'ahmedabad', 'jaipur', 'lucknow', 'surat', 'nagpur',
      'indore', 'bhopal', 'chandigarh', 'kochi', 'noida', 'gurgaon',
      'gurugram', 'thane', 'vadodara', 'agra', 'coimbatore', 'visakhapatnam',
    ];
    let city: string | null = null;
    for (let i = 0; i < indianCities.length; i++) {
        if (lower.includes(indianCities[i])) {
            city = indianCities[i].charAt(0).toUpperCase() + indianCities[i].slice(1);
            break;
        }
    }

    let familySize: number | null = null;
    const familyMatch = lower.match(/family\s+of\s+(\d+)/);
    if (familyMatch) familySize = parseInt(familyMatch[1]);
    else if (lower.match(/\bcouple\b|\b2\s+people\b/)) familySize = 2;
    else if (lower.match(/\bfour\b.*\bfamily\b|\bfamily.*\bfour\b/)) familySize = 4;

    let monthlyKm: number | null = null;
    const kmMatch = text.match(/(\d+)\s*(?:km|kms|kilometers?)\s*(?:a\s+)?(?:month|monthly|per\s+month)/i);
    if (kmMatch) monthlyKm = parseInt(kmMatch[1]);

    let cityVsHighway: ParsedIntake['cityVsHighway'] = null;
    const highwayKeywords = ['highway', 'road trip', 'hill', 'ooty', 'long drive', 'outstation', 'travel'];
    const cityKeywords = ['city', 'traffic', 'office', 'commute', 'short'];
    
    let hasHighway = false;
    for (let i = 0; i < highwayKeywords.length; i++) {
        if (lower.includes(highwayKeywords[i])) {
            hasHighway = true; break;
        }
    }

    let hasCity = false;
    for (let i = 0; i < cityKeywords.length; i++) {
        if (lower.includes(cityKeywords[i])) {
            hasCity = true; break;
        }
    }

    if (hasHighway && hasCity) cityVsHighway = 'mixed';
    else if (hasHighway) cityVsHighway = 'highway';
    else if (hasCity) cityVsHighway = 'city';
    else cityVsHighway = 'mixed';

    const parkingConcern = lower.includes('parking') || lower.includes('scary') || lower.includes('tight') || lower.includes('small car');
    const fuelConfusion = lower.includes('no clue') || lower.includes('not sure') || lower.includes('confus') || lower.includes('fuel type');

    const priorities: string[] = [];
    if (lower.match(/safe|safety|ncap|secure/)) priorities.push('safety');
    if (lower.match(/mileage|fuel efficient|economy|kmpl/)) priorities.push('mileage');
    if (lower.match(/space|room|spacious|luggage|boot/)) priorities.push('space');
    if (lower.match(/comfort|smooth/)) priorities.push('comfort');

    const dealbreakers: string[] = [];
    if (lower.match(/no\s+diesel|avoid\s+diesel/)) dealbreakers.push('diesel');
    if (lower.match(/no\s+ev|avoid\s+ev|not.*electric/)) dealbreakers.push('electric');
    if (lower.match(/no\s+manual|automatic\s+only/)) dealbreakers.push('manual');
    if (lower.match(/no\s+suv|sedan\s+only/)) dealbreakers.push('suv');

    return { budget, city, familySize, monthlyKm, cityVsHighway, parkingConcern, fuelConfusion, priorities, dealbreakers };
  }
}
