# CLAUDE.md: Project Engineering Guardrails

## Purpose

This file defines strict engineering rules for this project to address weak areas from prior reviews. It serves as a guardrail file for production-minded implementation, enforcing standards around reproducibility, AI transparency, code quality, security, and observability.

---

## 1. Code Quality & Architectural Standards

### Workflow & Structure
- **Backend-First**: Always implement and verify backend logic before touching the frontend.
- **Verification**: Always start the server and verify changes live on both backend and frontend layers.

### Types & Syntax Strictness
- **No `as any`**: Never use type casting with `as any`. Instead, explicitly define variables with `: any` if absolutely necessary.
- **Loops over Iterators**: Avoid functional array iterators (like `.map()`, `.forEach()`, `.filter()`) at all costs. Default to traditional `for` loops unless strictly impossible. 

### Data & Configuration Centralization
- **Constants Service Setup**: All magic strings, return messages, fallback defaults, and environmental reads must exclusively reside in `ConstantsService`. Do not hardcode strings or fallback parameters locally inside function code blocks.
- **Secure Standard APIs**: Every controller API endpoint must be structurally unified to return: `{ success: boolean, message: string, data: any }`.

### Storage & Fake Data
- **Seeding**: Ownership and reliability must be verified by seeding SQLite via `seed.ts`, properly generating realistic sample entries for every available entity model.

---

## 2. Reproducibility & Dependency Rules

### Dependency Management
- **Strict Pinning**: Use exact dependency versions only. Do not use loose version ranges such as `^` or `~`.
- **Minimal Footprint**: Prefer built-in platform capabilities (e.g., native crypto over external UUID libraries). Do not add packages unless clearly necessary for the core demo.
- **Stable Packages**: Avoid experimental packages or unstable libraries. 

### Runtime Consistency
- Commit the package manager lock files safely to the repository.
- Document the Node.js version explicitly (adding `.nvmrc` if possible).
- Keep the setup environment minimal requiring the fewest installation steps.
- The project must build smoothly from a clean install using documented commands. Avoid hidden local-only assumptions.

---

## 3. Security Hygiene

### Input & Output Safety
- **Inputs**: Validate all user inputs. Handle empty, malformed, or out-of-range inputs safely. Never trust the client.
- **Outputs**: Never render model output as raw HTML. Escape or safely render all dynamic output.

### Secret Handling
- Store all API keys inside environment variables only. 
- Never log environment variables, hardcode API keys, or commit `.env` into source control. 
- Provide an `.env.example` file cleanly listing the expected variables.

### Data Minimization
- Do not collect necessary user information (PII, emails, phone numbers) unless essential for the specific demo.
- Wrap all sensitive external model/API calls in `try/catch` blocks. Return safe, non-sensitive error messages to clients without exposing raw stack traces.

---

## 4. AI Process Transparency Rules

### Usage Boundaries
Use AI strictly where it adds value:
- Extracting structured data from natural language.
- Generating hyper-personalized user-facing explanations.
- Dynamically asking clarifying questions.

Do NOT use AI blindly for:
- Generating source-of-truth facts.
- Unconstrained application logic or architecture modifications.
- Replacing code-native deterministic logic.

### Responsibilities (Deterministic vs AI)
Always separate deterministic code (validation, basic filtering, DB storage) from model-driven output (explanations, wording, semantics). If a choice exists, default to deterministic pure code.

### Prompting Discipline
All internal prompts must:
- Restrict the model to the provided datasets contexts.
- Forbid hallucinating specs outside its limits.
- Require highly structured output (e.g., strict JSON schema schemas).
- When prompts evolve, leave a brief log on why it changed (to improve reliability).

---

## 5. Logging and Observability

### Logging Principles
- Add lightweight systematic logs to trace: request starts, parsed constraints, model call dispatching, fallback path triggers, and execution ends.
- Logs exist to debug behavior, not just execution traces. 
- Keep logs concise, and explicitly deny tracking secrets or unnecessary raw user data.

### Fallback Behavior & Visibility
- Failures should reliably surface in backend logs, but be masked by graceful fallback UI representations to the user.
- Silent failures are unequivocally banned.
- Every AI-dependent flow must possess a safety fallback behavior: what happens if the AI rate-limits? What happens if it parses corrupted constraints? Define these fail-safes natively to protect the standard deterministic application flow.

---

## 6. Documentation & Time Constraint Tiers

### Repo Documentation
Document the development process visibly:
- Outline setup sequences explicitly.
- Make AI decision-making known — where AI was deployed effectively versus where deterministic rules were kept. 

### Prioritization Under Pressure
If delivery time is constrained, strictly prioritize as follows:
1. Deterministic flow reliability (the app must run without breaking).
2. Input validation and API wrapper safety.
3. Graceful LLM failure handling / fallback routes.
4. Internal operational observability via logs.
5. Final code polish.

*Never sacrifice stability and safety for experimental features.*

---

## 7. Frontend Architecture Rules

### API Layer
- **`api.ts` is the only gateway**: All API calls must go through `api.ts`. Never use raw `fetch` or `axios` directly in components or hooks. `api.ts` owns loading state, toast notifications, auth headers, and error handling.
- **Pass loaders**: Always pass the loading setter (e.g., `setLoading`) into `api.ts` calls so it can manage the loading state centrally.
- **Backend-driven messages**: Let the backend `message` field drive user-facing alerts. `api.ts` reads it and triggers toasts — do not duplicate alert logic in components.
- **`setData` for state**: Use `setData` (or equivalent direct state setters) to apply API responses. Do not transform or re-wrap responses outside `api.ts`.

### Notifications
- **Single toast system**: Use the shared `Toast` component for all alerts, errors, and success messages. Never use `alert()`, `console` output to the user, or inline error text outside the designated error zone.

### List Rendering
- **`MapComponent` for lists**: Use the shared `MapComponent` wrapper to render all multi-item lists. Never inline `.map()` rendering directly in JSX outside of `MapComponent`.

### Routing & Navigation
- **SPA back-button contract**: This is a Single Page Application. Every route transition must be push-based so the browser back button works correctly. Never replace history entries unless explicitly navigating "back". Test back-button behavior on every new route added.

### Responsiveness
- **All UI must be responsive**: Every component and layout must work correctly at mobile (≥320px), tablet (≥768px), and desktop (≥1280px) breakpoints. Never hardcode pixel widths that break on small screens.

### Permissions & Visibility
- **Action visibility by permission**: Buttons, links, and interactive controls must be conditionally rendered based on the user's permissions. Never show an action the user cannot perform — hide it entirely rather than just disabling it.

### Theme & Styling
- **Single `theme` source of truth**: All colors, spacing tokens, font sizes, border radii, shadows, and animation durations must be defined in a dedicated theme component/file (e.g., `theme.ts` or `theme.css`). No component may hardcode a color hex, pixel value, or style constant directly — it must reference the theme. If a value isn't in the theme, add it there first.

### Hooks & Effects
- **One `useEffect` per page with `[]`**: Each page component may have at most one `useEffect` with an empty dependency array (`[]`) for its initial data fetch. If additional effects are needed with dependencies, ask before adding them.
- **Single loading state**: Use one shared `loading` / `setLoading` state per page. Never create additional boolean loading flags for individual sub-operations — reuse the existing one.

### Build Gate
- **Build must pass**: After every change, run the build (`npm run build`) and ensure zero TypeScript errors and zero build failures before considering work complete.

---

## 8. What Good Looks Like

To the reviewer, this application should prove:
- The system logic is reproducible flawlessly without undocumented side-effects.
- Dependency drift is locked off entirely.
- AI is leveraged explicitly for generative scaling while cleanly insulated from structural business logic.
- Failsafes operate gracefully.
- The engineer respects and understands high-grade production architectures.