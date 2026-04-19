// src/types.ts
export interface Car {
  id: number;
  brand: string;
  model: string;
  variant: string;
  price_min_lakh: number;
  price_max_lakh: number;
  fuel_type: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid';
  transmission: 'manual' | 'automatic' | 'amt' | 'cvt';
  seating: number;
  length_mm: number;
  mileage_kmpl: number;
  safety_rating: number;
  segment: string;
  source_tag: string;
  image_url: string;
}

export interface RankedCar {
  car: Car;
  rankType: 'topPick' | 'alternative' | 'surprise';
  rationale: string;
  insight1: string;
  insight2: string;
  tradeoff: string;
  becauseYouSaid: string;
}

export interface ShortlistResult {
  topPick: RankedCar;
  alternative: RankedCar;
  surprise: RankedCar;
  latentPersona?: string;
}

export interface ClarifyQuestion {
  question: string;
  options: string[];
  dimension: string;
  questionNumber: number;
}

export type AppStep = 'input' | 'clarify' | 'loading' | 'results';

export interface StreamEvent {
  stage: 'parsed' | 'clarifying' | 'retrieving' | 'ranking' | 'done';
  message: string;
}
