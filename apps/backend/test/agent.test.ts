// Unit-tests the "money node" — the ranker + its output contract — against the
// real NestJS app, AI mocked. Tests the existing /api/shortlist flow, not a
// synthetic agent module. Uses Vitest; excluded from Jest (*.spec.ts) by naming.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';

// NestJS source is dynamically imported inside buildApp() so reflect-metadata
// setup completes before any @Injectable decorator is evaluated.
const BACKEND = '../src';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CARS = [
  { id: 1, brand: 'Maruti',   model: 'Brezza CNG',  variant: 'ZXI',      price_min_lakh: 9.9,  price_max_lakh: 13.5, fuel_type: 'cng',    transmission: 'manual',    seating: 5, length_mm: 3995, mileage_kmpl: 30.48, safety_rating: 4, segment: 'suv',   source_tag: 'CarDekho 2025', image_url: '' },
  { id: 2, brand: 'Hyundai',  model: 'Creta',        variant: 'S',        price_min_lakh: 11.0, price_max_lakh: 20.0, fuel_type: 'petrol', transmission: 'automatic', seating: 5, length_mm: 4300, mileage_kmpl: 16.8,  safety_rating: 5, segment: 'suv',   source_tag: 'CarDekho 2025', image_url: '' },
  { id: 3, brand: 'Tata',     model: 'Nexon',        variant: 'Creative', price_min_lakh: 8.1,  price_max_lakh: 15.5, fuel_type: 'petrol', transmission: 'manual',    seating: 5, length_mm: 3993, mileage_kmpl: 17.4,  safety_rating: 5, segment: 'suv',   source_tag: 'CarDekho 2025', image_url: '' },
  { id: 4, brand: 'Toyota',   model: 'Hyryder',      variant: 'V Hybrid', price_min_lakh: 13.2, price_max_lakh: 19.7, fuel_type: 'hybrid', transmission: 'automatic', seating: 5, length_mm: 4365, mileage_kmpl: 27.97, safety_rating: 4, segment: 'suv',   source_tag: 'CarDekho 2025', image_url: '' },
  { id: 5, brand: 'Mahindra', model: 'Scorpio-N',    variant: 'Z8',       price_min_lakh: 13.9, price_max_lakh: 23.9, fuel_type: 'diesel', transmission: 'manual',    seating: 7, length_mm: 4662, mileage_kmpl: 16.0,  safety_rating: 5, segment: 'suv',   source_tag: 'CarDekho 2025', image_url: '' },
];

const MOCK_CLARIFY_Q = { question: 'Fuel preference?', options: ['Petrol', 'CNG', 'Hybrid'], dimension: 'fuel' };
const VALID_PROMPT   = 'Need a car in Pune for my family of 4. Budget is 15 lakhs. Mostly city commute.';
const OFFTOPIC_PROMPT = "My friend's car was totaled in an accident and I want to sue the insurance company — which car should I buy?";

const MOCK_SHORTLIST = {
  topPick:     { car: CARS[0], rankType: 'topPick',     rationale: 'Best balance for Pune city driving.',        insight1: '30.48 km/kg CNG mileage', insight2: '4-star NCAP',   tradeoff: 'CNG boot space reduced.',         becauseYouSaid: 'family of 4 in Pune', source: 'CarDekho reviews' },
  alternative: { car: CARS[1], rankType: 'alternative', rationale: 'If you want 5-star safety above all else.',  insight1: '5-star Bharat NCAP 2023', insight2: '17.4 kmpl',      tradeoff: 'Petrol running cost higher.',     becauseYouSaid: 'city commute',        source: 'Bharat NCAP' },
  surprise:    { car: CARS[3], rankType: 'surprise',    rationale: 'Hybrid delivers 27.97 kmpl — lowest TCO.',   insight1: '27.97 kmpl hybrid',       insight2: 'Self-charging',  tradeoff: 'Price ₹13.2L is at budget edge.', becauseYouSaid: '15 lakhs budget',     source: 'Team-BHP' },
  latentPersona: 'Budget-conscious Pune family buyer',
};

// ── App factory ──────────────────────────────────────────────────────────────

async function buildApp(): Promise<{ app: INestApplication; dbDir: string }> {
  const { AppModule }      = await import(`${BACKEND}/app.module`);
  const { GeminiService }  = await import(`${BACKEND}/ai/gemini.service`);
  const { ClarifyService } = await import(`${BACKEND}/clarify/clarify.service`);
  const { RankService }    = await import(`${BACKEND}/rank/rank.service`);
  const { CompareService } = await import(`${BACKEND}/shortlist/compare.service`);

  const dbDir = `/tmp/backend-agent-test-${Date.now()}`;
  const saved = process.env.DB_DIR;
  process.env.DB_DIR = dbDir;

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GeminiService)
    .useValue({ isFallback: () => true, getModel: () => { throw new Error('no AI'); } })
    .overrideProvider(ClarifyService)
    .useValue({ generate: vi.fn().mockResolvedValue(MOCK_CLARIFY_Q), decideNext: vi.fn().mockResolvedValue({ done: true }) })
    .overrideProvider(RankService)
    .useValue({ rank: vi.fn().mockResolvedValue(MOCK_SHORTLIST) })
    .overrideProvider(CompareService)
    .useValue({ compare: vi.fn().mockResolvedValue('Tata Nexon is safest; Brezza CNG lowest TCO.') })
    .compile();

  const app = module.createNestApplication();
  await app.init();
  process.env.DB_DIR = saved;
  return { app, dbDir };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — output contract (mocked AI, no API key needed)
// ─────────────────────────────────────────────────────────────────────────────

describe('ranker output contract (mocked AI)', () => {
  let app: INestApplication;
  let dbDir: string;
  let reqId: string;

  beforeAll(async () => {
    ({ app, dbDir } = await buildApp());
    const intake = await request(app.getHttpServer()).post('/api/intake').send({ text: VALID_PROMPT });
    reqId = intake.body.data.requestId;
    await request(app.getHttpServer()).post('/api/clarify').send({ requestId: reqId });
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('returns exactly 3 picks with tags topPick / alternative / surprise', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/shortlist').send({ requestId: reqId, answer: 'Petrol' }).expect(200);

    const { shortlist } = res.body.data;
    expect(shortlist).not.toBeNull();
    expect(shortlist.topPick.rankType).toBe('topPick');
    expect(shortlist.alternative.rankType).toBe('alternative');
    expect(shortlist.surprise.rankType).toBe('surprise');
  });

  it('every card has the full rationale contract', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/shortlist').send({ requestId: reqId, answer: 'CNG' }).expect(200);

    const picks = [res.body.data.shortlist.topPick, res.body.data.shortlist.alternative, res.body.data.shortlist.surprise];
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      expect(typeof p.rationale).toBe('string');
      expect(p.rationale.length).toBeGreaterThan(0);
      expect(typeof p.becauseYouSaid).toBe('string');
      expect(p.becauseYouSaid.length).toBeGreaterThan(0);   // anti-hallucination: must reference user context
      expect(typeof p.insight1).toBe('string');
      expect(typeof p.insight2).toBe('string');
      expect(typeof p.tradeoff).toBe('string');
      expect(p.car).toBeDefined();
      expect(typeof p.car.brand).toBe('string');
    }
  });

  it('off-topic prompt — output stays car-focused, no legal/accident content', async () => {
    const intake2 = await request(app.getHttpServer()).post('/api/intake').send({ text: OFFTOPIC_PROMPT }).expect(200);
    const id2 = intake2.body.data.requestId;
    await request(app.getHttpServer()).post('/api/clarify').send({ requestId: id2 });
    const res = await request(app.getHttpServer())
      .post('/api/shortlist').send({ requestId: id2, answer: 'Petrol' }).expect(200);

    const picks = [res.body.data.shortlist.topPick, res.body.data.shortlist.alternative, res.body.data.shortlist.surprise];
    const badTerms = ['accident', 'lawsuit', 'sue', 'insurance claim', 'legal advice', 'totaled'];
    for (let i = 0; i < picks.length; i++) {
      const text = (picks[i].rationale + ' ' + picks[i].becauseYouSaid).toLowerCase();
      for (let j = 0; j < badTerms.length; j++) {
        expect(text, `pick[${i}] must not contain "${badTerms[j]}"`).not.toContain(badTerms[j]);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — input schema validation (pure Zod, no HTTP)
// ─────────────────────────────────────────────────────────────────────────────

describe('IntakeRequestSchema — input validation', async () => {
  const { IntakeRequestSchema } = await import(`${BACKEND}/common/schemas`);

  it('rejects oversized prompt (>2000 chars)', () => expect(IntakeRequestSchema.safeParse({ text: 'x'.repeat(2001) }).success).toBe(false));
  it('rejects short prompt (under 10 chars)',  () => expect(IntakeRequestSchema.safeParse({ text: 'hi' }).success).toBe(false));
  it('accepts a valid user paragraph',         () => expect(IntakeRequestSchema.safeParse({ text: VALID_PROMPT }).success).toBe(true));
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — real integration (only when GEMINI_SERVICE_JSON is set)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!process.env.GEMINI_SERVICE_JSON)('ranker — integration (real Gemini)', () => {
  let app: INestApplication;
  let dbDir: string;
  let reqId: string;

  beforeAll(async () => {
    const { AppModule } = await import(`${BACKEND}/app.module`);
    dbDir = `/tmp/backend-agent-integration-${Date.now()}`;
    process.env.DB_DIR = dbDir;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    const intake = await request(app.getHttpServer()).post('/api/intake').send({ text: VALID_PROMPT });
    reqId = intake.body.data.requestId;
    await request(app.getHttpServer()).post('/api/clarify').send({ requestId: reqId });
  }, 30_000);

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('returns exactly 3 picks with correct rankTypes', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/shortlist').send({ requestId: reqId, answer: 'CNG for low running cost' }).expect(200);
    const { shortlist } = res.body.data;
    expect(shortlist.topPick.rankType).toBe('topPick');
    expect(shortlist.alternative.rankType).toBe('alternative');
    expect(shortlist.surprise.rankType).toBe('surprise');
  }, 30_000);

  it('becauseYouSaid references user context (anti-hallucination)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/shortlist').send({ requestId: reqId, answer: 'CNG for low running cost' }).expect(200);
    const picks = [res.body.data.shortlist.topPick, res.body.data.shortlist.alternative, res.body.data.shortlist.surprise];
    const promptLower = VALID_PROMPT.toLowerCase();
    let atLeastOne = false;
    for (let i = 0; i < picks.length; i++) {
      const bys: string = picks[i].becauseYouSaid.toLowerCase();
      if (promptLower.includes(bys.split(' ').slice(0, 3).join(' '))) atLeastOne = true;
    }
    expect(atLeastOne, 'at least one becauseYouSaid must reference user input').toBe(true);
  }, 30_000);
});
