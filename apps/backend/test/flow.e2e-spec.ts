// test/flow.e2e-spec.ts — end-to-end flow tests (AI mocked, real DB in temp dir)
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';
import { GeminiService } from '../src/ai/gemini.service';
import { ClarifyService } from '../src/clarify/clarify.service';
import { RankService } from '../src/rank/rank.service';
import { CompareService } from '../src/shortlist/compare.service';
import type { Car, RankedCar, ShortlistResult } from '../src/common/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_CAR: Car = {
  id: 1,
  brand: 'Maruti',
  model: 'Ertiga',
  variant: 'VXI',
  price_min_lakh: 8.8,
  price_max_lakh: 12.9,
  fuel_type: 'petrol',
  transmission: 'manual',
  seating: 7,
  length_mm: 4395,
  mileage_kmpl: 20.3,
  safety_rating: 4,
  segment: 'mpv',
  source_tag: 'CarDekho 2025',
  image_url: 'https://example.com/ertiga.jpg',
};

function makeRankedCar(rankType: RankedCar['rankType']): RankedCar {
  return {
    car: MOCK_CAR,
    rankType,
    rationale: 'Great choice for your needs.',
    insight1: '20.3 kmpl real-world mileage',
    insight2: '4-star NCAP safety rating',
    tradeoff: 'Manual gearbox only in this price range.',
    becauseYouSaid: 'Because you need a 7-seater within budget.',
  };
}

const MOCK_SHORTLIST: ShortlistResult = {
  topPick: makeRankedCar('topPick'),
  alternative: makeRankedCar('alternative'),
  surprise: makeRankedCar('surprise'),
  latentPersona: 'Budget-conscious family buyer',
};

const MOCK_CLARIFY_Q = {
  question: 'What fuel type do you prefer?',
  options: ['Petrol 🚗', 'Diesel 🛢️', 'Electric ⚡', 'Hybrid 🔋'],
  dimension: 'fuel',
};

const NEXT_CLARIFY_Q = {
  question: 'How important is parking ease for you?',
  options: ['Very important 🅿️', 'Somewhat important 📏', 'Not a concern 🏡'],
  dimension: 'parking',
};

const VALID_INPUT = 'I need a 7-seater family car for 5 people in Mumbai. Budget is 12 lakhs. Mix of city and highway driving.';

// ── App factory ───────────────────────────────────────────────────────────────

interface AppHandle { app: INestApplication; dbDir: string; }

async function buildApp(decideNext?: jest.Mock): Promise<AppHandle> {
  const dbDir = `/tmp/shortlist-flow-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  const savedDbDir = process.env.DB_DIR;
  process.env.DB_DIR = dbDir;

  const decideNextFn = decideNext ?? jest.fn().mockResolvedValue({ done: true });

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GeminiService)
    .useValue({ isFallback: () => true, getModel: () => { throw new Error('No AI in tests'); } })
    .overrideProvider(ClarifyService)
    .useValue({ generate: jest.fn().mockResolvedValue(MOCK_CLARIFY_Q), decideNext: decideNextFn })
    .overrideProvider(RankService)
    .useValue({ rank: jest.fn().mockResolvedValue({ ...MOCK_SHORTLIST }) })
    .overrideProvider(CompareService)
    .useValue({ compare: jest.fn().mockResolvedValue('Maruti Ertiga is the best pick for your family of 5.') })
    .compile();

  const app = module.createNestApplication();
  await app.init();

  process.env.DB_DIR = savedDbDir;
  return { app, dbDir };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Full happy-path flow
// ─────────────────────────────────────────────────────────────────────────────

describe('Full API Flow (E2E)', () => {
  let app: INestApplication;
  let dbDir: string;
  let requestId: string;

  beforeAll(async () => {
    ({ app, dbDir } = await buildApp());
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  });

  // ── POST /api/intake ──────────────────────────────────────────────────────

  describe('POST /api/intake', () => {
    it('returns 200 with requestId, parsed data, and step=clarify', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/intake')
        .send({ text: VALID_INPUT })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.message).toBe('string');
      expect(typeof res.body.data.requestId).toBe('string');
      expect(res.body.data.step).toBe('clarify');
      expect(res.body.data.parsed).toBeDefined();

      requestId = res.body.data.requestId;
    });

    it('parses budget as lakhs from natural language input', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/intake')
        .send({ text: 'Need a car budget 15 lakhs family of 4 Delhi city traffic.' })
        .expect(200);

      expect(res.body.data.parsed.budget).toBe(15);
      expect(res.body.data.parsed.city).toBe('Delhi');
      expect(res.body.data.parsed.familySize).toBe(4);
    });

    it('returns 400 when text is shorter than 10 chars', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/intake')
        .send({ text: 'hi' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('returns 400 when text field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/intake')
        .send({})
        .expect(400);
    });

    it('returns 400 when body is empty', async () => {
      await request(app.getHttpServer())
        .post('/api/intake')
        .expect(400);
    });
  });

  // ── POST /api/clarify ─────────────────────────────────────────────────────

  describe('POST /api/clarify', () => {
    it('returns 200 with question, options, and dimension', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/clarify')
        .send({ requestId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.question).toBe(MOCK_CLARIFY_Q.question);
      expect(res.body.data.options).toEqual(MOCK_CLARIFY_Q.options);
      expect(res.body.data.dimension).toBe(MOCK_CLARIFY_Q.dimension);
    });

    it('returns 400 for non-UUID requestId', async () => {
      await request(app.getHttpServer())
        .post('/api/clarify')
        .send({ requestId: 'not-a-uuid' })
        .expect(400);
    });

    it('returns 404 for a valid UUID that has no session', async () => {
      await request(app.getHttpServer())
        .post('/api/clarify')
        .send({ requestId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('returns 400 when requestId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/clarify')
        .send({})
        .expect(400);
    });
  });

  // ── POST /api/shortlist ───────────────────────────────────────────────────

  describe('POST /api/shortlist', () => {
    it('returns shortlist when AI decides clarification is complete', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/shortlist')
        .send({ requestId, answer: 'Petrol 🚗' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.needsMoreClarification).toBe(false);
      expect(res.body.data.nextQuestion).toBeNull();

      const shortlist = res.body.data.shortlist;
      expect(shortlist).not.toBeNull();
      expect(shortlist.topPick.car.brand).toBe('Maruti');
      expect(shortlist.topPick.car.model).toBe('Ertiga');
      expect(shortlist.topPick.rankType).toBe('topPick');
      expect(shortlist.alternative.rankType).toBe('alternative');
      expect(shortlist.surprise.rankType).toBe('surprise');
    });

    it('returns 400 when answer is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/shortlist')
        .send({ requestId })
        .expect(400);
    });

    it('returns 400 when answer is empty string', async () => {
      await request(app.getHttpServer())
        .post('/api/shortlist')
        .send({ requestId, answer: '' })
        .expect(400);
    });

    it('returns 404 for a valid UUID with no session', async () => {
      await request(app.getHttpServer())
        .post('/api/shortlist')
        .send({ requestId: '00000000-0000-0000-0000-000000000000', answer: 'Petrol' })
        .expect(404);
    });
  });

  // ── POST /api/shortlist/compare ───────────────────────────────────────────

  describe('POST /api/shortlist/compare', () => {
    it('returns a non-empty verdict string', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/shortlist/compare')
        .send({ requestId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.verdict).toBe('string');
      expect(res.body.data.verdict.length).toBeGreaterThan(0);
    });

    it('returns 404 for a valid UUID with no session', async () => {
      await request(app.getHttpServer())
        .post('/api/shortlist/compare')
        .send({ requestId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });
  });

  // ── Response envelope contract ────────────────────────────────────────────

  describe('Response envelope', () => {
    it('every 200 response includes { success: true, message: string, data: object }', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/intake')
        .send({ text: VALID_INPUT })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
      expect(typeof res.body.data).toBe('object');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Multi-question clarification loop
// ─────────────────────────────────────────────────────────────────────────────

describe('Multi-question clarification loop (E2E)', () => {
  let app: INestApplication;
  let dbDir: string;
  let reqId: string;

  beforeAll(async () => {
    const decideNext = jest.fn()
      .mockResolvedValueOnce({ done: false, nextQuestion: NEXT_CLARIFY_Q })
      .mockResolvedValueOnce({ done: true });

    ({ app, dbDir } = await buildApp(decideNext));
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('intake creates a session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/intake')
      .send({ text: VALID_INPUT })
      .expect(200);

    reqId = res.body.data.requestId;
    expect(typeof reqId).toBe('string');
  });

  it('first shortlist call returns needsMoreClarification=true with Q2', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/shortlist')
      .send({ requestId: reqId, answer: 'Petrol 🚗' })
      .expect(200);

    expect(res.body.data.needsMoreClarification).toBe(true);
    expect(res.body.data.shortlist).toBeNull();

    const nq = res.body.data.nextQuestion;
    expect(nq).not.toBeNull();
    expect(nq.question).toBe(NEXT_CLARIFY_Q.question);
    expect(nq.questionNumber).toBe(2);
    expect(Array.isArray(nq.options)).toBe(true);
    expect(nq.options.length).toBeGreaterThan(0);
  });

  it('second shortlist call returns the final shortlist', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/shortlist')
      .send({ requestId: reqId, answer: 'Not a concern 🏡' })
      .expect(200);

    expect(res.body.data.needsMoreClarification).toBe(false);
    expect(res.body.data.nextQuestion).toBeNull();
    expect(res.body.data.shortlist).not.toBeNull();
    expect(res.body.data.shortlist.topPick).toBeDefined();
    expect(res.body.data.shortlist.alternative).toBeDefined();
    expect(res.body.data.shortlist.surprise).toBeDefined();
  });
});
