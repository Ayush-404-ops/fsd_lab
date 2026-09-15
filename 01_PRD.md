# IndieVault — AI Layer: Product Requirements Document (PRD)

**Scope note:** IndieVault's core (auth, RBAC, submission workflow, marketplace) is already defined in the project blueprint. This PRD covers only the **AI layer** added on top of that — it assumes the base platform (MySQL + MongoDB + Node/Express + JWT) as already built/in progress.

---

## 1. Problem statement

From the market research in the blueprint doc: the biggest failure mode for indie marketplaces isn't distribution, it's **discovery and submission quality** — Steam's open-door model floods the store with low-signal listings, while admin-only manual review doesn't scale. IndieVault's AI layer targets exactly these two pressure points without removing the human in the loop:

1. Admins reviewing submissions have no assistance — every submission gets the same manual effort regardless of obvious red flags or missing info.
2. Players can't quickly tell if a game is worth their time from a wall of raw reviews.
3. Developers picking tags for discoverability are guessing, when the research shows specific micro-tags matter far more than broad ones.

## 2. Goals (v1 scope)

| # | Feature | Who it's for | Outcome |
|---|---|---|---|
| 1 | **Submission Triage Assistant** | Admin | Every submission gets an AI-generated summary + risk flags *before* a human reviews it, cutting review time without removing human approval |
| 2 | **Review Summarizer** | Player | Each game page shows an AI-generated pros/cons summary of existing reviews, refreshed periodically |
| 3 | **Smart Tag Suggestion** | Developer | At submission time, AI suggests 5–8 specific micro-tags based on the game description, instead of developers picking from a generic list |

**Explicitly out of scope for v1:** a full recommendation engine, real-time chat support bot, and automated approve/reject decisions. All AI outputs in v1 are **advisory only** — a human always makes the final call.

## 3. User stories

- *As an admin*, when I open a submission in the review queue, I want to see an AI-generated one-paragraph summary and a list of flagged concerns (e.g. "store description doesn't mention platform," "screenshots may not match description") so I can review faster and more consistently.
- *As a player*, when I open a game page with 40+ reviews, I want a short summary of common praise and complaints so I don't have to read all of them.
- *As a developer*, when I fill out the submission form, I want tag suggestions based on my game's description so my listing is actually discoverable instead of guessing at generic tags.
- *As an admin*, I want to see when a review summary or triage note was AI-generated vs. human-written, so trust in the system stays intact.

## 4. Success metrics (course-project framing)

Since this won't have real production traffic, frame metrics as **demonstrable in a viva/demo** rather than live KPIs:

- Submission triage note generates in under ~5 seconds and produces a structured, consistent format across different test submissions.
- Review summary correctly reflects sentiment when tested against a hand-written set of mixed positive/negative sample reviews.
- Tag suggestions are visibly more specific than a control group of manually-picked broad tags (e.g. "cozy farming sim" vs. "indie, casual").
- System degrades gracefully (see Architecture doc, §5 Fallback Logic) when the AI API is unavailable — this is itself a demoable feature, not just a nice-to-have.

## 5. Constraints

- **Cost/rate limits**: this is a course project — batch/cache aggressively, don't call the API on every page load.
- **No training data of your own**: v1 uses a hosted LLM (see Tech Stack doc) via prompting, not a fine-tuned or custom-trained model. Don't scope this as an ML training project — it's an LLM-integration project.
- **Human-in-the-loop is non-negotiable**: AI never auto-publishes, auto-rejects, or auto-bans. This is both a safety property and a legitimate design talking point for evaluation.
- **Latency budget**: submission triage and tag suggestion can be synchronous (user is actively waiting); review summarization should be pre-computed/cached, not generated on every page view.

## 6. Open questions to resolve before implementation

- Which LLM provider/model per feature (cost vs. quality tradeoff) — addressed in Tech Stack doc.
- Where AI-generated content is visually marked as such in the UI (recommend: a small "AI-generated summary" label, non-negotiable for transparency).
- Whether review summaries regenerate on a schedule (e.g. nightly) or on-demand with a cache TTL.
