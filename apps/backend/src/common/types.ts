// apps/backend/src/common/types.ts
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
  segment: 'hatchback' | 'compact-suv' | 'sedan' | 'midsize-suv' | 'mpv' | 'suv';
  source_tag: string;
  image_url: string;
}

export interface ParsedIntake {
  budget: number | null;         // in lakhs
  city: string | null;
  familySize: number | null;
  monthlyKm: number | null;
  cityVsHighway: 'city' | 'highway' | 'mixed' | null;
  parkingConcern: boolean;
  fuelConfusion: boolean;
  priorities: string[];
  dealbreakers: string[];
}

export interface ClarifyQuestion {
  question: string;
  options: string[];
  dimension: string;             // what aspect this question addresses
}

export interface ClarifyHistoryItem {
  question: string;
  options: string[];
  dimension: string;
  answer: string;
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
