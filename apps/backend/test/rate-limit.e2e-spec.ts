// test/rate-limit.e2e-spec.ts — per-endpoint throttle tests (AI mocked, real throttler)
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';
import { GeminiService } from '../src/ai/gemini.service';
import { ClarifyService } from '../src/clarify/clarify.service';
import { RankService } from '../src/rank/rank.service';
import { CompareService } from '../src/shortlist/compare.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_CLARIFY_Q = {
  question: 'What fuel type do you prefer?',
  options: ['Petrol 🚗', 'Diesel 🛢️', 'Electric ⚡', 'Hybrid 🔋'],
  dimension: 'fuel',
};

const MOCK_SHORTLIST = {
  topPick: {
    car: {
      id: 1, brand: 'Maruti', model: 'Ertiga', variant: 'VXI',
      price_min_lakh: 8.8, price_max_lakh: 12.9,
      fuel_type: 'petrol', transmission: 'manual', seating: 7,
      length_mm: 4395, mileage_kmpl: 20.3, safety_rating: 4,
      segment: 'mpv', source_tag: 'CarDekho 2025',
      image_url: 'https://example.com/ertiga.jpg',
    },
    rankType: 'topPick' as const,
    rationale: 'Great for families.',
    insight1: '20.3 kmpl',
    insight2: '4-star NCAP',
    tradeoff: 'Manual only.',
    becauseYouSaid: 'You need a 7-seater.',
  },
  alternative: null,
  surprise: null,
  latentPersona: 'Family buyer',
};

const VALID_TEXT = 'I need a 7-seater family car for 5 people in Mumbai. Budget is 12 lakhs.';
const NULL_UUID  = '00000000-0000-0000-0000-000000000000';

// ── App factory ───────────────────────────────────────────────────────────────

interface AppHandle { app: INestApplication; dbDir: string; }

async function buildTestApp(): Promise<AppHandle> {
  const dbDir = `/tmp/throttle-test-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  const savedDbDir = process.env.DB_DIR;
  process.env.DB_DIR = dbDir;

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GeminiService)
    .useValue({ isFallback: () => true, getModel: () => { throw new Error('No AI in tests'); } })
    .overrideProvider(ClarifyService)
    .useValue({
      generate: jest.fn().mockResolvedValue(MOCK_CLARIFY_Q),
      decideNext: jest.fn().mockResolvedValue({ done: true }),
    })
    .overrideProvider(RankService)
    .useValue({ rank: jest.fn().mockResolvedValue({ ...MOCK_SHORTLIST }) })
    .overrideProvider(CompareService)
    .useValue({ compare: jest.fn().mockResolvedValue('Maruti Ertiga is the best pick.') })
    .compile();

  const app = module.createNestApplication();
  await app.init();

  process.env.DB_DIR = savedDbDir;
  return { app, dbDir };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function collect429(statuses: number[]): number {
  let count = 0;
  for (let i = 0; i < statuses.length; i++) {
    if (statuses[i] === 429) count++;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite: POST /api/intake — limit 10/min
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate limit — POST /api/intake (10/min)', () => {
  let app: INestApplication;
  let dbDir: string;

  beforeAll(async () => {
    ({ app, dbDir } = await buildTestApp());
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('returns 429 after 10 requests in the same window', async () => {
    const promises: Promise<number>[] = [];

    for (let i = 0; i < 11; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/api/intake')
          .send({ text: VALID_TEXT })
          .then(res => res.status),
      );
    }

    const statuses = await Promise.all(promises);
    const hits429 = collect429(statuses);

    expect(hits429).toBeGreaterThanOrEqual(1);
  });

  it('429 response matches { success: false, message, data: null } envelope', async () => {
    // Exhaust the remaining quota (already used 11 above, but use a fresh check)
    // Send additional requests until we see a 429
    let res429: request.Response | null = null;

    for (let i = 0; i < 15; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/intake')
        .send({ text: VALID_TEXT });

      if (res.status === 429) {
        res429 = res;
        break;
      }
    }

    expect(res429).not.toBeNull();
    expect(res429!.body.success).toBe(false);
    expect(typeof res429!.body.message).toBe('string');
    expect(res429!.body.message.toLowerCase()).toContain('too many');
    expect(res429!.body.data).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite: POST /api/clarify — limit 30/min
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate limit — POST /api/clarify (30/min)', () => {
  let app: INestApplication;
  let dbDir: string;

  beforeAll(async () => {
    ({ app, dbDir } = await buildTestApp());
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('returns 429 after 30 requests in the same window', async () => {
    const promises: Promise<number>[] = [];

    // Sending 31 requests with a non-existent UUID — each returns 404 quickly.
    // The throttler counts them before the controller logic runs.
    for (let i = 0; i < 31; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/api/clarify')
          .send({ requestId: NULL_UUID })
          .then(res => res.status),
      );
    }

    const statuses = await Promise.all(promises);
    const hits429 = collect429(statuses);

    expect(hits429).toBeGreaterThanOrEqual(1);
  });

  it('429 response matches the error envelope', async () => {
    let res429: request.Response | null = null;

    for (let i = 0; i < 35; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/clarify')
        .send({ requestId: NULL_UUID });

      if (res.status === 429) {
        res429 = res;
        break;
      }
    }

    expect(res429).not.toBeNull();
    expect(res429!.body.success).toBe(false);
    expect(res429!.body.data).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite: POST /api/shortlist — limit 30/min
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate limit — POST /api/shortlist (30/min)', () => {
  let app: INestApplication;
  let dbDir: string;

  beforeAll(async () => {
    ({ app, dbDir } = await buildTestApp());
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('returns 429 after 30 requests in the same window', async () => {
    const promises: Promise<number>[] = [];

    for (let i = 0; i < 31; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/api/shortlist')
          .send({ requestId: NULL_UUID, answer: 'Petrol' })
          .then(res => res.status),
      );
    }

    const statuses = await Promise.all(promises);
    const hits429 = collect429(statuses);

    expect(hits429).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite: POST /api/shortlist/compare — limit 10/min
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate limit — POST /api/shortlist/compare (10/min)', () => {
  let app: INestApplication;
  let dbDir: string;

  beforeAll(async () => {
    ({ app, dbDir } = await buildTestApp());
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('returns 429 after 10 requests in the same window', async () => {
    const promises: Promise<number>[] = [];

    for (let i = 0; i < 11; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/api/shortlist/compare')
          .send({ requestId: NULL_UUID })
          .then(res => res.status),
      );
    }

    const statuses = await Promise.all(promises);
    const hits429 = collect429(statuses);

    expect(hits429).toBeGreaterThanOrEqual(1);
  });

  it('429 response matches the error envelope', async () => {
    let res429: request.Response | null = null;

    for (let i = 0; i < 15; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/shortlist/compare')
        .send({ requestId: NULL_UUID });

      if (res.status === 429) {
        res429 = res;
        break;
      }
    }

    expect(res429).not.toBeNull();
    expect(res429!.body.success).toBe(false);
    expect(typeof res429!.body.message).toBe('string');
    expect(res429!.body.message.toLowerCase()).toContain('too many');
    expect(res429!.body.data).toBeNull();
  });
});
