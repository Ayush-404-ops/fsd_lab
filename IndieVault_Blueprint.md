# IndieVault — Research, Feature Set, Tech Stack & Workflow

*A two-sided indie game marketplace with a developer submission + admin approval pipeline, positioned as a fairer alternative to Steam, Epic Games Store, and itch.io.*

---

## 1. Why this document exists

Before writing more code, it helps to know what you're actually competing against and where the real gaps are. This document covers:

1. Market research — how Steam, Epic, and itch.io actually operate today
2. The core feature set IndieVault needs to be a real marketplace, not just a CRUD app
3. Recommended tech stack, aligned to what you already know
4. The submission → review → approval → publish workflow
5. Differentiators — features that would make IndieVault genuinely different, not a clone

---

## 2. Market research: how the big three actually work in 2026

| Platform | Revenue split | Audience size | Positioning | Key weakness |
|---|---|---|---|---|
| **Steam** | 70/30 standard, dropping to 75/25 above $10M and 80/20 above $50M gross *(per game, not per catalog)* | ~132M monthly active users | Dominant, back-catalog driven (79% of H1 2026 revenue was pre-2026 titles) | Open-door submission (Steam Direct, $100 fee) has flooded the store — 20K+ games released in 2025, ~9,370 of them got fewer than 10 user reviews |
| **Epic Games Store** | 88/12 standard, and 0% platform fee on the first $1M revenue per game per year | ~68–78M MAU | Aggressive developer-friendly cut, subsidized by Fortnite; growing 3rd-party spend fast (+57% YoY in 2025) | Much smaller catalog and weaker organic discovery outside curated free-game promotions |
| **itch.io** | Developer sets their own cut (0–100%), typically defaults around 90/10 | Smallest, but highly loyal/experimental audience | No mandatory fees, instant publishing, community-first | Very little built-in infrastructure (no matchmaking, weak analytics, low mainstream visibility) |

Some structural things worth understanding before designing IndieVault's own systems:

- **Discovery, not distribution, is the real bottleneck for indies today.** The median indie game on Steam earns around $570 lifetime. Nearly half of 2025's Steam releases got under 10 reviews, and ~2,200 got *zero*. The problem isn't getting listed — it's ever being seen.
- **Steam's discovery algorithm optimizes for purchase probability, not quality.** It's driven by wishlists, tag-adjacency ("More Like This"), and behavioral similarity — which systematically favors games that already have traction, and buries first-time or niche developers.
- **Broad tags have stopped working as a discovery signal.** Because almost every indie title tags itself "Indie + Adventure + Singleplayer," the signal is diluted. Platforms are shifting toward specific micro-tags (e.g. "cozy + crafting + alchemy" beats generic "indie + adventure").
- **Steam Next Fest-style visibility events have become tiered** — developers report needing ~2,000 wishlists before the event's own algorithm gives meaningful lift, which defeats the purpose for genuinely new developers.
- **Developers who post to itch.io directly asking "what do you want in a marketplace"** consistently ask for the same handful of things: real discovery without a black-box algorithm, equal footing for small titles next to big ones, real analytics/data on player behavior, and direct community/feedback tools.

**Takeaway for IndieVault:** the differentiated wedge isn't a cheaper cut or a bigger catalog — it's **fairer, non-algorithmic discovery** and **a submission pipeline that filters for quality without becoming a walled garden.**

---

## 3. Core feature set

### 3.1 Player-facing
- Browse/search with **micro-tag filtering** (not just broad genre tags)
- Game detail pages: screenshots, trailer embed, description, system requirements, changelog
- Reviews & star ratings (kept in MongoDB, separate from relational core data)
- Wishlist + library (owned/purchased games)
- User profiles with public activity (games owned, reviews written)

### 3.2 Developer-facing
- Developer dashboard: submission status, sales, downloads, wishlist counts
- Game submission form: metadata, build upload, pricing, revenue-share selection
- Analytics: conversion rate (page views → wishlists → purchases), player demographics if available, refund rate
- Direct feedback inbox from players (structured, not just public reviews)
- Version/patch management (upload new builds against an existing listing)

### 3.3 Admin-facing (the differentiator)
- **Submission queue** with a checklist-based review (not just approve/reject) — technical checks (does it launch, virus scan, screenshots match gameplay) and content checks (store page quality, no plagiarism/asset flipping)
- Role-based access control: Player / Developer / Admin / **Curator** (see below)
- Moderation tools: reported reviews, reported content, ban/suspend accounts
- Platform-wide analytics: submission volume, approval/rejection rates, revenue

---

## 4. Recommended tech stack

Given what you already know (Node/Express, MongoDB, JWT, Vue/React via Vite, Django, PostgreSQL) and what IndieVault's current practicals have already locked in (MySQL + MongoDB + Node/Express + JWT/bcrypt), here's a stack that builds on that rather than replacing it:

| Layer | Recommendation | Why |
|---|---|---|
| **Relational DB** | MySQL (already chosen) | Users, roles, games, transactions, payouts — structured data with real relationships and constraints |
| **Document DB** | MongoDB (already chosen) | Reviews, activity logs, analytics events — high-volume, loosely structured data |
| **Backend** | Node.js + Express (already chosen) | REST API, RBAC middleware, JWT auth |
| **Frontend** | Vue or React (Vite) | You know both — Vue if you want faster iteration for a course deadline, React if you want the portfolio to read as more "industry-standard" |
| **File storage** | Local disk for coursework demo; note that in production this would be S3/Cloudinary for game builds & screenshots | Game builds can be large — don't store binaries in MySQL/Mongo |
| **Payments (stub for coursework)** | Stripe test mode, or a mocked payment service | You almost certainly don't need real payments for a course project — simulate the transaction and payout ledger instead |
| **Search** | MySQL full-text search is enough for course scope; mention Elasticsearch/Meilisearch as a "future work" upgrade | Real fuzzy/tag-based search is a legitimate scaling story to write about in your report even if you don't implement it |
| **Realtime (optional)** | Socket.io | Only if you add live notifications (submission approved, new review, etc.) — nice to have, not core |

---

## 5. Submission → Review → Approval workflow

```
Developer submits game
        │
        ▼
Automated checks (file type/size, required fields, image dimensions)
        │
        ▼
 Status: "Pending Review" ──────────────► Admin queue
        │                                     │
        │                          Admin opens submission
        │                                     │
        │                    ┌────────────────┼────────────────┐
        │                    ▼                ▼                ▼
        │               "Approved"      "Needs Changes"    "Rejected"
        │                    │                │                │
        │                    ▼                ▼                ▼
        │           Game goes live     Back to developer   Developer notified
        │           (status: Published) with admin notes    with reason
        │
        ▼
Post-publish: developer can push updates → new build re-enters a
lightweight review queue (patch review, not full resubmission)
```

Key design decisions worth writing into your project report:
- **Every status transition should be logged** (who changed it, when, why) — this is a natural use for your MongoDB logs collection, and it's the kind of audit trail a real evaluator will want to see in a marketplace project.
- **Rejections should always require a reason** — this is both good UX and an easy "extra feature" to point to in a viva/demo.
- **Admins shouldn't be the only reviewers forever** — see the Curator role below for how this scales.

---

## 6. What would actually differentiate IndieVault

These are features Steam, Epic, and itch.io either don't have, or actively get criticized for lacking. Even implementing 2–3 of these for a course project gives you a strong "why this is not just a clone" answer for evaluators.

1. **Curator role (community-driven discovery, not algorithmic)**
   A user role between Player and Admin: trusted curators can create public "Collections" (e.g. "Best cozy games under ₹200") that surface on the homepage. This directly answers the #1 complaint about Steam — discovery being a black box.

2. **Transparent, tiered revenue share instead of one fixed number**
   Let developers choose (like itch.io), but show a simple calculator on the submission form comparing what they'd earn on IndieVault vs. a flat-30% model — makes your pitch/report concrete and data-backed.

3. **Quality gate without being a walled garden**
   Unlike Steam Direct (pay $100, publish almost anything) or itch (publish anything instantly), IndieVault's admin-approval step is the actual product differentiator — pitch it explicitly as "curated enough to avoid the shovelware problem, open enough to not be gatekept like console stores."

4. **Micro-tag-first discovery**
   Instead of broad genre tags, require developers to pick from a constrained set of specific descriptive tags at submission (this is also just easier to implement well than a real recommendation engine, and you can talk about *why* in your report, citing the actual 2026 shift away from broad tags).

5. **Developer analytics dashboard**
   Even a simple version (views → wishlists → purchases funnel) is something itch.io is criticized for lacking and Steam only gives well after a game is already live. Doing this from day one is a legitimate differentiator.

6. **Structured developer ↔ player feedback loop**
   A feature request/bug report inbox tied to a specific game version, visible only to the developer — separate from public reviews. None of the big three do this well; players currently have to use Discord or Steam forums for this.

7. **Post-purchase refund/escrow window**
   Hold payout to developer for a short window (e.g. 14 days) to allow refunds before finalizing — a real payments/marketplace concept that's genuinely more sophisticated than a basic CRUD checkout, and a good thing to describe in a viva even if you only implement the state machine, not real money movement.

---

## 7. Suggested phasing (fits a practical-by-practical course structure)

| Phase | Feature focus |
|---|---|
| Already done (P1–P2) | Schema, auth, RBAC |
| Near-term | Game submission form + admin approval queue + status workflow |
| Mid | Player browse/search + wishlist/library + reviews |
| Later | Developer analytics dashboard, curator collections |
| Stretch/report-only | Payment/escrow simulation, Elasticsearch-based search, Socket.io notifications |

Treat sections 6 and 7's stretch items as things you can *describe in your final report as "designed but not fully implemented due to scope/time"* — evaluators generally respond well to a clear roadmap even for unbuilt features, as long as you can explain the reasoning.

---

## Sources
- Fungies.io — Steam Revenue Share Explained (2026), Best Platforms to Sell Games Online (2026), Indie Developer Market Analysis (2026)
- Shattered.io — Steam vs Epic Games Store (2026), Epic Games Store Revenue (2026)
- Tech-Insider.org — itch.io vs GOG vs Epic Games Store (2026)
- SteamPageAnalyzer.com — Steam vs Epic for Indie Developers (2026)
- Althera Games Blog — Steam Algorithm 2026
- Outlook Respawn — Steam's Algorithm is Burying Good Indie Games
- GamerEmpire — Steam's Discovery Problem (2026)
- itch.io community post — "additional features you want in a game marketplace"
