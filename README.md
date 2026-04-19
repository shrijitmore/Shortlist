# Shortlist — AI-Powered Indian Car Recommender

A conversational car-buying assistant for the Indian market. Users describe their situation in plain language; the system clarifies ambiguities, retrieves candidates from a local SQLite database, and returns three ranked picks with personalised rationale.

**Live app:** https://shortlist-frontend-seven.vercel.app  
**GitHub:** https://github.com/shrijitmore/Shortlist.git  
**Screen recording:** https://drive.google.com/drive/folders/1XVbxSqhjuUuJ_rTQVUJVSm-izuccGL8u?usp=sharing

---

## What I Built and Why

**The core bet:** Car buyers don't fail because of missing specs; they fail because no tool speaks their language. Someone who types "family of 4 in Pune, scared of parking, 15 lakhs" doesn't know what a compact SUV is. I built the interface that meets them there.

The flow: free-text intake → one AI-generated clarifying question (user picks a chip **or** types a free-form answer) → deterministic retrieval + scoring → three ranked picks (top, alternative, surprise) with personalised rationale quoting the user's own words → a compare verdict.

## What I Cut (and Would Build With More Time)

- **Real owner review RAG** — `source: "Team-BHP"` is currently a label, not a citation. The ranker doesn't read any reviews. The real version pulls owner posts from Team-BHP and CarDekho, chunks them by topic (boot space, mileage, service cost), and has the agent cite actual sentences. That's what earns trust over a spec sheet. Cut because the indexing and retrieval infrastructure takes longer than the ranking logic itself.
- **TCO calculator** — when the surprise card says "the hybrid pays back in six years," that number is hardcoded in the tradeoff template. The real version computes it: user's monthly KMs, planned ownership period, current petrol/CNG/hybrid fuel prices, break-even to the month. Running cost is the number that actually closes decisions in India, not sticker price. Cut because it requires per-variant running cost specs and live fuel price data that weren't in scope.
- **Hinglish voice input** — most buyers in Pune don't type in English. Whisper handles Hinglish well. A mic button feeding the transcription straight to the intake parser is a small integration with outsized reach for the Indian market.
- **"Why NOT this car" node** — every Indian car site explains why to buy something. A dedicated anti-recommendation layer that surfaces context-specific reasons against a car ("you said parking is a concern — the Scorpio-N is 4.66m long") would be a genuine differentiator. Cut for time.
- User accounts / saved shortlists — adds infrastructure complexity for zero recommendation quality gain in a demo.
- Dealer lead CTA flows — out of scope for an MVP evaluation.

---

## Tech Stack and Why

Nothing fancy. The decision worth defending is NestJS over plain Express — the DI boundaries earn their keep once LangGraph node logic starts touching multiple service layers. Without them, graph nodes become spaghetti.

| Layer | Choice | Reason |
|---|---|---|
| Backend | NestJS | Typed DI, clean module boundaries; enforces service isolation so AI logic never bleeds into HTTP logic |
| AI orchestration | LangGraph (LangChain) | Stateful multi-turn graph with built-in checkpointing — the clarify loop needs to remember answers across HTTP requests without a session DB |
| LLM | Gemini 2.5 Flash via Vertex AI | Fastest structured-output latency in the budget; `withStructuredOutput` maps directly to Zod schemas |
| Validation | Zod | Single schema definition shared between HTTP input validation (ZodPipe) and AI output enforcement (structured output) |
| Database | SQLite (better-sqlite3) | Zero infrastructure, seeded from scraped data, works identically in Docker and local dev |
| Frontend | React + Vite + Framer Motion | Fast HMR; Framer Motion for the SSE-driven progressive reveal that makes the AI "thinking" visible |
| Streaming | Server-Sent Events | One-way push for status stages (parsing → clarifying → ranking) — no WebSocket overhead needed |

---

## AI vs Manual — Where Tools Helped and Where They Didn't

**Delegated to AI:**
- All boilerplate: NestJS module/service/controller scaffolding, Zod schema definitions, React component structure, Docker and nginx config
- Initial prompt drafts for all six AI calls
- Frontend animations and theme system
- Test file structure (Jest E2E fixtures, vi.mock setup)

**Done manually (or heavily corrected):**
- **LangGraph graph topology** — which nodes interrupt, where state accumulates, and the `interruptBefore: ['clarifier_router']` pattern that makes the multi-turn loop work across HTTP requests. AI kept generating a single-shot graph.
- **Budget bug** — AI returned rupees; caught from a live test showing a Fortuner in a ₹12L result. The two-layer fix (prompt instruction + retrieval normalisation + 1.25× ceiling) was written manually.
- **Retrieval scoring algorithm** — the multi-factor scoring (budget fit 30pts, seating 20pts, size/parking 15pts, driving mode 10pts, safety 10pts, mileage 10pts, clarifier adjustments) was designed and tuned by hand.
- **Prompt guardrails** — spec-number requirement, source enum, off-topic rule were added after observing the AI produce unverifiable claims ("great mileage") and legal commentary on accident-related test inputs.

**Where AI got in the way:**
- Repeatedly suggested `.map()`, `.filter()`, `as any`, and hardcoded magic strings — all CLAUDE.md violations that required correction loops.
- Generated a new `apps/api` package with a completely different LLM provider when asked for tests against the existing flow — misread "unit test the ranker" as "build a new agent." Required explicit redirection.
- `@nestjs/throttler` v6's `@Throttle()` decorator syntax differs from v5; AI generated the old syntax, caught after seeing runtime 500s.

---

## Quick Start

### Docker (recommended)
```bash
cp apps/backend/.env.example apps/backend/.env   # fill in GEMINI_SERVICE_JSON
docker-compose up --build
# Frontend → http://localhost:5173   Backend → http://localhost:3001
```

### Local
```bash
npm install

# terminal 1 — backend (seeds SQLite then starts NestJS on :3001)
cd apps/backend
npm run build:scripts && npm run seed:prod
npm run start:dev

# terminal 2 — frontend (Vite on :5173, auto-loads .env.development → localhost:3001)
cd apps/frontend && npm run dev
```

Frontend environment files:
- `.env.development` → `VITE_API_URL=http://localhost:3001` (used by `npm run dev`)
- `.env.production`  → `VITE_API_URL=https://shortlist-113087462794.asia-south1.run.app` (used by Vercel builds)

### Deployment

| Surface | Platform | Triggered by |
|---|---|---|
| Backend | Google Cloud Run (`asia-south1`, 1 GiB) | `cloudbuild.yaml` → Cloud Build on push to `main` |
| Frontend | Vercel | Auto-deploy on push to `main` |

Backend build: `cloudbuild.yaml` at repo root runs `docker build apps/backend`, pushes to GCR, deploys to the `shortlist` Cloud Run service. The Dockerfile is a multi-stage Alpine build — compiles `better-sqlite3` native addons in the builder, copies the pruned `node_modules` into a slim runtime stage, runs as non-root, seeds SQLite then `exec`s `node dist/main` via `start.sh`.

### Run Tests
```bash
# E2E flow + rate-limit tests (Jest, AI mocked)
cd apps/backend && npm run test:e2e

# Agent contract + guardrail tests (Vitest, AI mocked)
cd apps/api && npm test

# Real Gemini integration (needs env var)
cd apps/api && GEMINI_SERVICE_JSON=... npm test
```

---

## Architecture

```
User text
   │
   ▼
[POST /api/intake]
   ├─ IntakeService.parse()         ← AI call #1: structured extraction
   └─ latent_surface node           ← AI call #2: buyer persona (non-blocking)
   │
   ▼
[POST /api/clarify]
   └─ ClarifyService.generate()    ← AI call #3: first clarifying question
   │
   ▼
[POST /api/shortlist]  (repeatable)
   ├─ ClarifyService.decideNext()  ← AI call #4: ask again or proceed?
   ├─ RetrieveService              (deterministic: scoring + hard budget ceiling)
   └─ RankService.rank()           ← AI call #5: rationale generation
   │
   ▼
[POST /api/shortlist/compare]
   └─ CompareService.compare()     ← AI call #6: final synthesis verdict
```

Every AI call has a deterministic fallback. The system runs end-to-end without Gemini — output quality degrades gracefully, never crashes.

---

## Prompt Engineering Audit Trail

Six AI calls power the flow. Each entry documents: purpose, output schema, current guardrails, bugs found during development, and the fix applied.

---

### Call #1 — Intake Parser

**File:** `apps/backend/src/intake/intake.service.ts`  
**Model output schema:** `ParsedIntakeSchema` — budget (lakhs), city, familySize, monthlyKm, cityVsHighway, parkingConcern, fuelConfusion, priorities[], dealbreakers[]

**Current prompt (key lines):**
```
You are an expert automotive consultant in India.
Extract structured details from the user's free-text car-buying description.
If a detail is not mentioned, return null or an empty array.
Ensure cityVsHighway is strictly 'city', 'highway', or 'mixed'.
IMPORTANT: Return "budget" as a number in LAKHS — never rupees.
  e.g. "12 lakhs" → 12  |  "₹15L" → 15  |  "20 lakh" → 20
```

**Bug found:** AI returned `budget: 1200000` (rupees) for "₹12 lakh budget". Downstream retrieval compared that against `price_min_lakh: 8.5` — the ratio was ~0, so every car passed the budget check. A Fortuner (₹34–50L) appeared in results for a ₹12L query.

**Fix (two layers):**
1. Prompt: explicit `IMPORTANT` instruction on unit.
2. Retrieval guard: `budget > 100 ? budget / 100_000 : budget` normalisation + hard ceiling: `price_min_lakh > budget × 1.25` → excluded.

**Fallback:** Regex rules covering 25 Indian city names, budget patterns, family size, driving mode keywords, and priority/dealbreaker terms.

---

### Call #2 — Latent Surface (Buyer Persona)

**File:** `apps/backend/src/graph/graph.service.ts` → `latent_surface` node  
**Output schema:** `PersonaSchema` — `{ persona: string }`

**Prompt:**
```
Based on the following query for a car, output a brief one-sentence latent buyer
persona describing their psychological perspective or unspoken needs.
Query: "${rawInput}"
```

**Guardrails:**
- Single-sentence constraint — output is used as a UI label on the results card
- Wrapped in `try/catch`; failure → `'Standard User'` — never blocks the flow

**Design note — AI only, no functional fallback:** Persona is decorative. It is not used in scoring or ranking. Degrading to a generic label is acceptable and safe.

---

### Call #3 — Clarifier: First Question

**File:** `apps/backend/src/clarify/clarify.service.ts` → `generate()`  
**Output schema:** `ClarifyQuestionSchema` — `{ question, options[], dimension }`

**Prompt (key rules):**
```
Identify the *single biggest missing piece of information* to recommend the perfect car.
Common ambiguities: fuel type | body style | parking | budget priority | city vs highway

Output exactly one question, exactly 3–4 emoji-rich multiple-choice options,
and a one-word dimension descriptor.
```

**Guardrails:**
- "exactly one question" prevents multi-part dumps
- `dimension` (single lowercase word) is tracked across all Q&A turns and fed back to `decideNext` to prevent repeat questions
- No fallback: unavailable AI throws — callers catch and surface a structured 503

---

### Call #4 — Clarifier: Continue or Done?

**File:** `apps/backend/src/clarify/clarify.service.ts` → `decideNext()`  
**Output schema:** `ClarifyDecisionSchema` — `{ done: boolean, nextQuestion?: ClarifyQuestion }`

**Prompt (key rules):**
```
Dimensions already covered: ${coveredDimsStr}

Probe (only if uncovered and still ambiguous): fuel | bodyStyle | parking | priority | usage

Rules:
- Do NOT ask about a dimension already covered.
- If all critical gaps are filled or remaining gaps are marginal → done: true.
- nextQuestion must have exactly 3–4 emoji-rich options.
- nextQuestion.dimension must be a single lowercase word.
```

**Guardrails:**
- Covered-dimension list injected into every call — AI cannot repeat a topic
- Hard cap of `MAX_CLARIFY_QUESTIONS = 5` enforced in the router node (not the prompt) — guarantees loop termination regardless of AI behaviour
- Failure safe: any exception → `{ done: true }` — flow always moves forward

**Design note:** The "enough context" threshold is left to AI judgement intentionally. When to stop is context-dependent; the hard cap is the safety net.

---

### Call #5 — Ranker (The Money Node)

**File:** `apps/backend/src/rank/rank.service.ts` → `aiRank()`  
**Output schema:** `AiRankResultSchema` (array of `SharedRankCardSchema` × 3)

```typescript
SharedRankCardSchema = z.object({
  rationale:      z.string(),
  insight1:       z.string().regex(/\d/),   // must cite a real number
  insight2:       z.string().regex(/\d/),   // must cite a real number
  tradeoff:       z.string(),
  becauseYouSaid: z.string(),
  source:         z.enum(['Autocar India', 'Team-BHP', 'Bharat NCAP', 'CarDekho reviews']),
})
```

**Prompt rules (full list):**
```
- "becauseYouSaid" MUST quote or closely paraphrase the user's OWN words — never generic.
- "rationale" must explain WHY this specific car suits THIS user's life.
- "tradeoff" must be an honest caveat the buyer should know.
- Keep each field to 1–2 sentences max.
- Do NOT hallucinate specs outside what is provided.
- For the surprise pick, explain why they should consider something they didn't ask for.
- insight1 and insight2 MUST each include at least one specific number from
  the provided car specs — no generic claims.
- source MUST be exactly one of: Autocar India, Team-BHP, Bharat NCAP, CarDekho reviews.
- Do NOT include accidents, lawsuits, insurance disputes, legal advice, or any
  non-car content in any field.
```

**Three guardrails added after audit:**

| Guardrail | Bug it fixes | Enforcement |
|---|---|---|
| `insight` must contain a digit | AI wrote `"great mileage"` with no number — unverifiable | Zod `.regex(/\d/)` rejects at parse time |
| `source` enum | No citation = invented authority | Zod `.enum(RANK_SOURCES)` in schema |
| Off-topic content banned | Off-topic prompts caused legal commentary in rationale fields | Prompt rule; tested in `agent.test.ts` |

**Car selection is fully deterministic — AI only writes copy:**
- topPick = highest-scored candidate from retrieval
- alternative = first candidate with different segment or fuel type than topPick
- surprise = first hybrid/EV, or cross-segment pick from remaining candidates

**Fallback (no AI):** `buildRankedCar()` generates all fields from car data + templates. `buildSource()` assigns source by rule: 5-star safety → Bharat NCAP · hybrid/EV → Team-BHP · mileage ≥ 20 kmpl → Autocar India · else → CarDekho reviews.

---

### Call #6 — Compare Verdict

**File:** `apps/backend/src/shortlist/compare.service.ts`  
**Output schema:** `VerdictSchema` — `{ verdict: string }`

**Prompt rules:**
```
- 3–4 sentences max.
- Reference the user's situation and how each car addresses it differently.
- End with a clear recommendation of which one to test-drive first and why.
- Do NOT hallucinate specs — use only what is provided.
- Be honest about tradeoffs.
```

**Fallback:** Template string referencing the three car names from the shortlist.

---

## Deterministic vs AI — Decision Map

The governing rule: if the failure mode is "AI returned nonsense," the step has a deterministic fallback. If the failure mode is "output has no personality," it doesn't need one.

| Step | Deterministic | AI |
|---|---|---|
| Input validation (length, UUID, etc.) | ✅ Zod + ZodPipe | |
| Budget unit parsing | ✅ Regex fallback | ✅ Primary |
| City / family size extraction | ✅ Regex fallback | ✅ Primary |
| Car database | ✅ SQLite, scraped + seeded | |
| Candidate scoring | ✅ Multi-factor algorithm | |
| Hard budget ceiling filter | ✅ `price_min > budget × 1.25` | |
| Which 3 cars to surface | ✅ Score rank + segment diversity | |
| Buyer persona label | | ✅ (non-blocking) |
| Clarifying questions | | ✅ (throws if unavailable) |
| Card copy: rationale, insights, tradeoff | ✅ Template fallback | ✅ Primary |
| Source citation | ✅ Rule-based fallback | ✅ Primary |
| Final compare verdict | ✅ Template fallback | ✅ Primary |

---

## Test Coverage

Tests are meaningful, not ceremonial — the E2E suite catches real contract regressions, the Vitest suite tests the guardrails that were added after observed failures.

| File | Runner | Covers |
|---|---|---|
| `apps/backend/test/flow.e2e-spec.ts` | Jest | Full HTTP flow (intake → clarify → shortlist → compare); multi-question clarification loop; 400 / 404 error cases; response envelope contract |
| `apps/backend/test/rate-limit.e2e-spec.ts` | Jest | Per-endpoint throttle limits (10/min intake, 30/min compare); 429 envelope shape |
| `apps/api/src/agent/agent.test.ts` | Vitest | Ranker output contract (3 picks, correct tags, full rationale fields); off-topic guardrail (no legal content); `IntakeRequestSchema` validation (oversized, too short, valid); real Gemini integration via `describe.skipIf(!GEMINI_SERVICE_JSON)` |
