# IndieVault — AI Architecture

## 1. High-level flow

```
                        ┌─────────────────────────┐
                        │   Express API (backend)  │
                        │                          │
   Frontend (Vue/React) │  /api/ai/triage          │
   ───────────────────► │  /api/ai/summarize       │──────► Anthropic Claude API
   (never calls the     │  /api/ai/suggest-tags    │◄────── (via server-side SDK)
   AI provider directly)│                          │
                        │  ┌────────────────────┐  │
                        │  │  ai-service module │  │
                        │  │  - prompt builder   │  │
                        │  │  - response parser  │  │
                        │  │  - cache layer      │  │
                        │  │  - fallback logic   │  │
                        │  └────────────────────┘  │
                        └───────────┬──────────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     ▼                             ▼
              MySQL (submissions,           MongoDB (cached AI
              games, review metadata)       outputs, review text,
                                             prompt/response logs)
```

**Core rule: the frontend never talks to the AI provider directly.** All AI calls are proxied through the Express backend, which is the only place holding the API key. This is both a security requirement and the natural place to add rate limiting, caching, and logging.

## 2. Components

### 2.1 `ai-service` module (new backend module)
A dedicated module (e.g. `/server/services/ai/`) responsible for:
- **Prompt builder** — assembles the system prompt + user data into a request (see Prompt Spec doc for exact templates)
- **Response parser** — validates and parses structured (JSON) output from the model; rejects and retries once on malformed output before falling back
- **Cache layer** — stores AI outputs in MongoDB keyed by content hash (e.g. hash of the review set, or hash of the submission text) so identical input doesn't trigger a repeat API call
- **Fallback logic** — see §5 below

### 2.2 Data flow per feature

**Submission Triage** (synchronous, admin-facing)
1. Admin opens a submission in the review queue.
2. Backend checks MongoDB cache for an existing triage note keyed by submission ID + content hash.
3. Cache miss → backend builds prompt from submission metadata (title, description, screenshots list, category, pricing) → calls Claude → parses structured JSON response (`summary`, `risk_flags[]`, `suggested_action`) → stores in cache → returns to frontend.
4. Frontend renders the note next to the submission, clearly labeled "AI-generated — review required."

**Review Summarization** (asynchronous/batch, player-facing)
1. A scheduled job (or on-demand admin trigger for course-demo purposes) pulls all reviews for a game from MongoDB.
2. If review count changed meaningfully since the last summary (e.g. by more than ~10%), regenerate; otherwise serve cached summary.
3. Backend builds a prompt from a sampled/truncated set of reviews (see Prompt Spec for how sampling avoids exceeding context limits on popular games), calls Claude, stores the structured summary (`pros[]`, `cons[]`, `overall_sentiment`) in MongoDB against the game ID.
4. Game page fetches the cached summary — **never calls the AI provider on page load.**

**Smart Tag Suggestion** (synchronous, developer-facing)
1. Developer fills in game title/description on the submission form and clicks "Suggest tags."
2. Backend sends description to Claude with the micro-tag prompt (see Prompt Spec), gets back a ranked list of specific tags.
3. Developer can accept, edit, or ignore suggestions — never auto-applied.

## 3. Model selection

| Feature | Recommended model | Why |
|---|---|---|
| Submission Triage | Claude Haiku 4.5 | High volume, low latency need, task is classification/summarization rather than deep reasoning |
| Review Summarization | Claude Sonnet 5 | Higher quality synthesis across potentially long, contradictory review text; runs in batch so latency matters less |
| Tag Suggestion | Claude Haiku 4.5 | Simple, fast, cheap — this is a short structured-output task |

Check `docs.claude.com` for current pricing/rate limits before finalizing — model lineups and pricing can change between when this doc is written and when you implement it.

## 4. Error handling & rate limiting

- **Backend-level rate limiting** via `express-rate-limit`: cap AI endpoints per-user (e.g. 10 requests/minute) separately from the rest of the API, since these are the most expensive calls.
- **Retry policy**: one retry on transient errors (5xx, timeout) with exponential backoff; no retry on 4xx (bad request) — surface those as real errors.
- **Malformed output handling**: if the model doesn't return valid JSON matching the expected schema, retry once with a stricter reminder in the prompt; if it still fails, fall back (see §5).

## 5. Fallback logic (demoable resilience)

If the AI provider is unavailable or the call fails after retries:
- **Submission Triage**: show "AI triage unavailable — manual review required" instead of blocking the admin from approving/rejecting.
- **Review Summarization**: fall back to showing raw aggregate stats (average rating, review count) instead of the AI summary.
- **Tag Suggestion**: fall back to a static list of common tags for the selected genre.

This fallback behavior is worth explicitly building and demoing — it shows the system was designed for real-world reliability, not just a happy-path demo.

## 6. Security

- API key lives in an environment variable (`ANTHROPIC_API_KEY`), loaded server-side only, never sent to or read by the frontend.
- `.env` is gitignored; a `.env.example` with empty values is committed instead.
- All AI endpoints require an authenticated session (JWT) — no anonymous AI calls, both for cost control and abuse prevention.
- Log prompts/responses for debugging, but strip or hash any personally identifying reviewer info before logging.

## 7. Why not a vector DB / full RAG pipeline for v1

A true RAG-based recommendation engine (embed all game descriptions + reviews, retrieve nearest neighbors) is a legitimate stretch goal, but for v1 scope it adds real infrastructure complexity (embedding pipeline, vector index maintenance, re-embedding on content updates) for a feature that isn't in the PRD's v1 scope. If you want to build it as a stretch feature, MongoDB Atlas Vector Search is the natural fit since MongoDB is already in the stack — document that as a "future work" section rather than building it under deadline pressure.
