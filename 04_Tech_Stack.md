# IndieVault — AI Layer Tech Stack

This extends the already-chosen base stack (MySQL, MongoDB, Node/Express, JWT + bcrypt, Vue/React via Vite) rather than replacing any of it.

## 1. AI provider

- **Claude API** (Anthropic), called server-side only via the official Node SDK (`@anthropic-ai/sdk`).
- Recommended models (check `docs.claude.com` for current names/pricing before implementing, since model lineups change):
  - **Claude Haiku 4.5** for Submission Triage and Tag Suggestion (fast, cheap, structured short-output tasks)
  - **Claude Sonnet 5** for Review Summarization (higher-quality synthesis, run in batch/cached so latency is less critical)

## 2. New backend structure

```
/server
  /services
    /ai
      client.js          # Anthropic SDK client init, reads ANTHROPIC_API_KEY
      promptBuilder.js    # builds prompts from templates (see Prompt Spec)
      responseParser.js   # validates/parses JSON output, retry-on-malformed
      cache.js            # MongoDB-backed cache lookups/writes
      fallback.js         # fallback responses per feature
  /routes
    /ai
      triage.js            # POST /api/ai/triage/:submissionId  (admin only)
      summarize.js         # GET  /api/ai/summary/:gameId       (public, cached)
      suggestTags.js       # POST /api/ai/suggest-tags          (developer only)
  /middleware
    aiRateLimiter.js       # express-rate-limit config specific to AI routes
```

## 3. Data storage additions (MongoDB)

New collections, alongside existing reviews/logs collections:

- `ai_triage_cache` — `{ submissionId, contentHash, promptVersion, summary, riskFlags, suggestedAction, createdAt }`
- `ai_review_summaries` — `{ gameId, promptVersion, pros, cons, overallSentiment, reviewCountConsidered, generatedAt }`
- `ai_call_logs` — `{ feature, promptVersion, latencyMs, success, errorType, timestamp }` (for debugging and for your report's "system behavior" section — do not log raw reviewer PII)

## 4. Dependencies to add

```
npm install @anthropic-ai/sdk express-rate-limit
```

(No vector DB dependency needed for v1 — see AI Architecture doc §7 on why RAG/embeddings are deferred to stretch scope.)

## 5. Environment variables

```
ANTHROPIC_API_KEY=            # server-side only, never exposed to frontend
AI_TRIAGE_MODEL=claude-haiku-4-5-20251001
AI_SUMMARY_MODEL=claude-sonnet-5
AI_TAG_MODEL=claude-haiku-4-5-20251001
AI_RATE_LIMIT_PER_MIN=10
```

Commit a `.env.example` with these keys and empty/placeholder values. Never commit the real `.env`.

## 6. Rate limiting

Apply `express-rate-limit` specifically to `/api/ai/*` routes, separate from your general API rate limits, since these calls carry real per-request cost:

```js
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_PER_MIN) || 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: "Too many AI requests, please slow down." }
});
```

## 7. Testing

- **Unit tests (Jest)**: mock the Anthropic SDK client so tests don't make real API calls — test `promptBuilder`, `responseParser` (including the malformed-JSON retry path), and `cache` logic in isolation.
- **Fallback tests**: explicitly test that each feature degrades correctly when the mocked client throws/times out (this maps directly to the fallback behavior in the Architecture doc, and is worth demoing).
- **Prompt regression checks (manual, course-scope)**: keep a small fixed set of sample inputs (2–3 submissions, 2–3 review sets, 2–3 descriptions) and re-run them whenever you change a prompt version, comparing output quality by eye — a lightweight substitute for full prompt-eval infrastructure, appropriate for this project's scope.

## 8. Deployment notes (course-demo vs. real production)

For a course demo: running everything locally (Node server + local MySQL/MongoDB instances) is sufficient — no need to actually deploy the AI layer publicly.

If you do want it publicly reachable for a portfolio link, note in your report that a production version would add: request queuing/backpressure for the AI endpoints, a proper secrets manager instead of a `.env` file, and monitoring/alerting on AI error rates — these are reasonable things to mention as "next steps" even if unbuilt.
