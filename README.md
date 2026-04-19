# Shortlist

A smart car recommendation MVP for Indian buyers. Provide your situation in plain text, answer one clarifying question, and get exactly three perfect car recommendations.

## Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: NestJS + better-sqlite3 + Zod
- **Database**: SQLite (seed data included)
- **Deployment**: Docker + Docker Compose

## Getting Started

### Method 1: Docker (Recommended)
You can run the entire stack effortlessly using Docker Compose.

```bash
docker-compose up --build
```
- Frontend will be available at `http://localhost:5173`
- Backend API will run on `http://localhost:3001`

### Method 2: Local Development

From the project root (monorepo root):

1. **Install Dependencies**
   ```bash
   npm install --prefix apps/backend
   npm install --prefix apps/frontend
   ```

2. **Run Backend (Terminal 1)**
   ```bash
   cd apps/backend
   npm run seed
   npm run start:dev
   ```

3. **Run Frontend (Terminal 2)**
   ```bash
   cd apps/frontend
   npm run dev
   ```

## Key Features
1. **Freeform Intake Engine**: Extracts variables like budget, city vs highway preference, safety concerns, etc., straight from a messy text paragraph.
2. **Dynamic Clarification**: Identifies the biggest ambiguity in the prompt and asks exactly one contextual question.
3. **Progressive Rendering (SSE)**: Uses Server-Sent Events to build suspense and show exactly what the engine is processing (Parsing → Clarifying → Retrieving → Ranking).
4. **Ranking Algorithm**: Generates a Top Pick, an Alternative, and a Surprise Pick (ev/hybrid or segment jump) based on calculated scores, rendering 3 aesthetic recommendation cards.

## Seed Data
The app automatically seeds 20 realistic Indian cars across various segments (e.g., Maruti Brezza, Hyundai Creta, Toyota Hyryder, Tata Punch EV, etc.) with real-world spec representations including safety ratings and boot capacities.
