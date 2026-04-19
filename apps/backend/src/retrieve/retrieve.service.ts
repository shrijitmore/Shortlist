// apps/backend/src/retrieve/retrieve.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Car, ParsedIntake } from '../common/types';

interface ScoredCar extends Car {
  score: number;
}

@Injectable()
export class RetrieveService {
  private readonly logger = new Logger(RetrieveService.name);

  constructor(private readonly db: DatabaseService) {}

  findCandidates(parsed: ParsedIntake, clarifierAnswer: string): Car[] {
    const budgetLakh = parsed.budget && parsed.budget > 100 ? parsed.budget / 100000 : parsed.budget;
    this.logger.log(
      `Candidate search — budget=${budgetLakh}L city=${parsed.city} family=${parsed.familySize} ` +
      `driving=${parsed.cityVsHighway} dealbreakers=[${parsed.dealbreakers.join(',')}]`
    );

    const allCars = this.db.getDb()
      .prepare('SELECT * FROM cars')
      .all() as Car[];

    const scored: ScoredCar[] = [];
    for (let i = 0; i < allCars.length; i++) {
      scored.push({
        ...allCars[i],
        score: this.score(allCars[i], parsed, clarifierAnswer),
      });
    }

    const filtered: ScoredCar[] = [];
    for (let i = 0; i < scored.length; i++) {
      const car = scored[i];
      let keep = true;
      if (budgetLakh && car.price_min_lakh > budgetLakh * 1.25) keep = false;
      if (parsed.dealbreakers.includes('diesel') && car.fuel_type === 'diesel') keep = false;
      if (parsed.dealbreakers.includes('electric') && car.fuel_type === 'electric') keep = false;
      if (parsed.dealbreakers.includes('manual') && car.transmission === 'manual') keep = false;
      if (parsed.dealbreakers.includes('suv') && car.segment.includes('suv')) keep = false;
      if (keep) filtered.push(car);
    }

    const candidates = filtered.sort((a, b) => b.score - a.score).slice(0, 10);
    const top3Parts: string[] = [];
    for (let i = 0; i < Math.min(3, candidates.length); i++) {
      top3Parts.push(`${candidates[i].brand} ${candidates[i].model}(${candidates[i].score})`);
    }
    this.logger.log(
      `Filter: ${allCars.length} total → ${filtered.length} in-budget → top ${candidates.length}: ${top3Parts.join(', ')}`
    );
    return candidates;
  }

  private score(car: Car, parsed: ParsedIntake, clarifierAnswer: string): number {
    let score = 0;

    // ── Budget fit (0–30 points) ─────────────────────────────────────
    if (parsed.budget) {
      const budgetLakh = parsed.budget > 100 ? parsed.budget / 100000 : parsed.budget;
      const carMid = (car.price_min_lakh + car.price_max_lakh) / 2;
      const budgetRatio = carMid / budgetLakh;
      if (budgetRatio <= 1.0) score += 30;
      else if (budgetRatio <= 1.1) score += 20;
      else if (budgetRatio <= 1.2) score += 10;
      else score -= 20;
    }

    // ── Seating fit (0–20 points) ────────────────────────────────────
    if (parsed.familySize) {
      if (car.seating >= parsed.familySize) score += 20;
      else if (car.seating === parsed.familySize - 1) score += 5;
      else score -= 15;
    }

    // ── Size / parking concern (0–15 points) ─────────────────────────
    if (parsed.parkingConcern) {
      if (car.length_mm <= 3900) score += 15;        // hatchback
      else if (car.length_mm <= 4100) score += 10;   // compact
      else if (car.length_mm <= 4300) score += 5;    // compact SUV
      else score -= 5;                                // large
    }

    // ── City vs Highway (0–10 points) ────────────────────────────────
    if (parsed.cityVsHighway === 'city') {
      if (car.mileage_kmpl >= 18) score += 10;
      if (car.segment === 'hatchback') score += 5;
    }
    if (parsed.cityVsHighway === 'highway') {
      if (car.mileage_kmpl >= 20) score += 10;
      if (['compact-suv', 'midsize-suv', 'suv'].includes(car.segment)) score += 5;
    }
    if (parsed.cityVsHighway === 'mixed') {
      if (car.mileage_kmpl >= 16) score += 8;
    }

    // ── Safety priority (0–10 points) ────────────────────────────────
    if (parsed.priorities.includes('safety')) {
      score += car.safety_rating * 2;
    } else {
      score += car.safety_rating * 0.5;
    }

    // ── Mileage priority (0–10 points) ───────────────────────────────
    if (parsed.priorities.includes('mileage')) {
      score += Math.min(car.mileage_kmpl / 2, 10);
    }

    // ── Clarifier answer adjustments ─────────────────────────────────
    const ans = clarifierAnswer.toLowerCase();

    if (ans.includes('petrol')) {
      if (car.fuel_type === 'petrol') score += 15;
      if (car.fuel_type === 'diesel') score -= 10;
    }
    if (ans.includes('diesel')) {
      if (car.fuel_type === 'diesel') score += 15;
    }
    if (ans.includes('ev') || ans.includes('electric') || ans.includes('charging')) {
      if (car.fuel_type === 'electric') score += 20;
    }
    if (ans.includes('practical') || ans.includes('workhorse')) {
      if (car.fuel_type === 'petrol' || car.fuel_type === 'cng') score += 8;
      if (car.safety_rating >= 4) score += 5;
    }
    if (ans.includes('compact') || ans.includes('city size') || ans.includes('parking')) {
      if (car.length_mm <= 4100) score += 15;
    }
    if (ans.includes('sensor') || ans.includes('camera')) {
      // prefer feature-rich variants
      if (['Brezza', 'Creta', 'Sonet', 'XUV 3XO', 'Nexon', 'FRONX'].includes(car.model)) score += 10;
    }
    if (ans.includes('highway') || ans.includes('hill') || ans.includes('stability')) {
      if (['compact-suv', 'midsize-suv'].includes(car.segment)) score += 15;
      if (car.fuel_type === 'diesel') score += 5;
    }
    if (ans.includes('comfort') || ans.includes('boot')) {
      if (car.segment === 'sedan' || car.segment === 'mpv') score += 10;
    }
    if (ans.includes('safety')) {
      score += car.safety_rating * 3;
    }
    if (ans.includes('resale')) {
      if (['Maruti', 'Hyundai', 'Toyota'].includes(car.brand)) score += 15;
    }
    if (ans.includes('tech') || ans.includes('touchscreen')) {
      if (['Hyundai', 'Kia', 'MG', 'Mahindra'].includes(car.brand)) score += 10;
    }

    return score;
  }
}
