# rooh — Experience Intelligence

An AI ingestion pipeline that turns a public experience URL into a structured,
evidence-backed, review-ready record — and refuses to publish any of it without
a human.

Built as a proof of concept for the rooh Founding Product Engineer take-home.

## 📽 Watch the demo

**[Video walkthrough (Loom)](https://www.loom.com/share/6ecc7dd686044c0aadf95f2ddf59d089)**
— the full workflow end to end: URL in, evidence-checked record out, human review.

## Deliverables

| What | Where |
|---|---|
| **Video walkthrough** | [loom.com/share/6ecc7dd6…](https://www.loom.com/share/6ecc7dd686044c0aadf95f2ddf59d089) |
| **Architecture diagram** | [`docs/architecture.md`](docs/architecture.md) — system diagram, trust boundary, request flow, Postgres schema, scaling path |
| **Technical rationale** | [`docs/technical-rationale.md`](docs/technical-rationale.md) — decisions, trade-offs, build vs. buy, what I'd build first at rooh |
| **Working POC** | this repo — [setup](#setup) below, runs locally with one API key |
| **Source code** | [`src/`](src/) — see [project structure](#project-structure) |

---

## The problem

Curating experiences by hand means finding a page, reading it, retyping it into
a consistent shape, and judging whether it belongs. The obvious automation —
point an LLM at a URL and record what it says — fails in a way that matters
here: a hallucinated price or date doesn't produce a broken page, it produces a
person who travelled to the wrong place at the wrong time.

So this POC treats extraction as the easy part. The design problem is knowing
**which extractions to trust.**

## The core idea

> **The LLM proposes; deterministic code decides.**

The model is never asked how confident it is — a model asked to rate its own
output rates its own fluency, and is most confident exactly when a fabrication
is hardest to spot.

Instead it must return **a verbatim source quote for every important field**
(price, date, address, city, provider). Application code then checks that each
quote actually appears in the fetched page. A value with no matching quote is a
mechanically detectable hallucination:

```
⚠  Price could not be verified from source evidence.
```

That single check is what separates this from a wrapper around an LLM call.
Everything downstream of the model — completeness, validation, deduplication,
confidence, the issue list — is ordinary deterministic code.

## Pipeline

```
URL
 → URL guard          SSRF: scheme, credentials, DNS → public IPs only
 → Content fetcher    TinyFish → Readability → fixture
 → AI structuring     ← the only model call
 → Zod validation     reject malformed model output
 → Evidence check     is every quote really in the source?
 → Quality scoring    completeness · validation · confidence · issues
 → Deduplication      normalised URL + content fingerprint
 → Human review       approve · edit · reject
 → CMS-ready record
```

Full diagrams, the trust boundary, and the production SQL schema are in
[docs/architecture.md](docs/architecture.md).

---

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env.local     # then add your Bedrock token
npm run dev                    # http://localhost:3000
```

### Environment variables

All are server-side only — none is prefixed `NEXT_PUBLIC_`, so no key can reach
the browser. Every model and extraction call happens in a route handler.

| Variable | Required | Purpose |
|---|---|---|
| `AWS_BEARER_TOKEN_BEDROCK` | **Yes** | Bedrock API key. A **bearer token**, not an AWS access-key/secret pair — the SDK uses bearer auth rather than SigV4. |
| `BEDROCK_AWS_REGION` | No | Defaults to `us-east-1`. Kept separate from a global `AWS_REGION`. |
| `BEDROCK_MODEL_ID` | No | Overrides the default model (Claude Sonnet 4.6). Must be a callable inference-profile id, e.g. `us.anthropic.claude-opus-4-6-v1`. |
| `TINYFISH_API_KEY` | No | TinyFish Fetch API — browser-rendered extraction. Without it, falls back to fetch + Readability. |
| `ALLOW_FIXTURE_FALLBACK` | No | `1` falls back to bundled sample content when live extraction fails, so the demo always runs. |

Without `TINYFISH_API_KEY` the app still works on server-rendered pages, which
is most listing sites. Client-rendered pages will return too little content and
fall through.

---

## Demo

> Prefer to watch? **[Video walkthrough on Loom](https://www.loom.com/share/6ecc7dd686044c0aadf95f2ddf59d089)**
> covers everything below. The steps here are for running it yourself.

**1 — Analyze a page.** Paste a public experience URL and press Analyze. Fetch
plus one model call takes 5–15 seconds.

Known-good URLs are wired into the page as one-click examples:

```
https://cranleigharts.org/event/sound-bath-september-2026/          clean extraction
https://www.chelseaphysicgarden.co.uk/event/summer-sound-bath-3/    price + start + end
https://luma.com/sdvrbram                                           correctly rejected
```

The third is a real, well-run fintech networking dinner. It extracts accurately
and is still refused — being a good event is not evidence of personal growth.

These are live third-party pages and will eventually go stale; if one shows the
demo-fixture banner, it has expired.

**2 — Read the review screen.** Worth looking at in this order:

- **Relevance vs. Confidence.** Different questions, computed differently.
  Relevance is the model's judgement about fit; confidence is our arithmetic
  over what we could verify. Hover Confidence for the four sub-scores.
- **Issues and missing fields.** Note the separation: an absent price is an
  honest gap in the *source*, an unverified price is a problem with our
  *extraction*.
- **Source evidence.** Every important value sits next to the quote it came
  from, marked Verified or Unverified.

**3 — Edit, then approve or reject.** Status persists and every action is
written to the audit trail at the bottom of the page.

### Demonstrating the interesting failure modes

| To show | Try |
|---|---|
| **Honest nulls** | A page with no stated price. `Price` shows `—`, not a guess. |
| **Relevance rejection** | A tech conference or product page. Should return `isRelevant: false` — the prompt states explicitly that being an event is not evidence of relevance. |
| **Listing vs. experience** | An Eventbrite category page rather than a single event. Should be rejected as a listing index. |
| **Duplicate detection** | Analyze the same URL twice, the second time with `?utm_source=newsletter`. Flagged as a duplicate, never auto-merged. |
| **Fixture labelling** | Unset `TINYFISH_API_KEY`, submit a URL that blocks bots. The fixture banner appears and source quality scores low — demo mode can't impersonate a live extraction. |

---

### Verifying it works

The deterministic half of the pipeline has an assertion suite that needs no
model call, no network and no keys:

```bash
curl localhost:3000/api/selftest        # 29 assertions, ends "ALL PASS"
```

It covers evidence verification (including a deliberately fabricated quote that
must be rejected), the scoring maths, semantic validation, URL normalisation,
fingerprinting, and the SSRF guard.

It is development-only; a deployed build returns 404.

## Design decisions

**Why AI at all.** Two sub-problems are genuinely semantic and resist rules:
turning arbitrary page prose into a fixed schema, and judging whether an
experience meaningfully supports personal growth. Everything else is better
served by code.

**Why deterministic validation.** So quality decisions are reproducible and
explainable. The same extraction always yields the same scores and warnings, and
a reviewer can be told *why* confidence is 61 rather than asked to trust it.

**Why human review is mandatory.** No code path auto-approves, whatever the
score. rooh's value is curation; a platform publishing unreviewed scraped
content is a directory, not a curated one. What automation changes is the *cost*
of review, from "read the page and retype it" to "check five highlighted values".

**Why no custom crawler.** Discovery is V2. Building a crawler before proving
extraction quality optimises the wrong end of the funnel — it produces more
records nobody has established are trustworthy.

**Why no vector database.** V1 has no semantic search requirement. Exact-match
deduplication catches the real case (same event, different tracking params) at
zero cost and full explainability. Embeddings become worthwhile at V4, when
near-duplicate titles get common enough to matter.

**Why discovery isn't implemented.** Same reason. It's represented in the
architecture and deliberately left unbuilt.

**Why the browser owns the records.** The analysis runs server-side because it
needs API keys, but the resulting records are stored client-side. On serverless,
each request may hit a different instance, so a server-side in-memory store
loses records between "analyse this URL" and "open the review page". Keeping
state in the browser makes the server genuinely stateless — which is what
serverless is — and lets the deployed demo work without provisioning a database.
Duplicate detection still works: the client sends its URL/fingerprint index with
each request.

**Why a single loading state.** The pipeline has six stages but four finish in
under 50 ms, and relevance isn't a separate step at all — it comes back in the
same model response as the fields. A six-step progress bar would have been
animation rather than information.

## Evolution

| | | |
|---|---|---|
| **V1** | *here* | URL ingestion → structured → human review |
| **V2** | | Automated discovery from event APIs, sitemaps and known feeds |
| **V3** | | Background jobs and scheduled revalidation (`content_hash` is already stored for this) |
| **V4** | | Semantic duplicate resolution with embeddings |
| **V5** | | Personalization and recommendations |

---

## Project structure

```
src/
  app/                    routes only — thin, delegating to views/
    api/analyze           POST — the whole pipeline (the only endpoint)
  views/                  page-level compositions
  components/             ingest/ · review/ · common/
  layouts/                AntdProvider · AppShell
  stores/                 CLIENT — zustand + localStorage, owns the review queue
  services/               CLIENT — the single axios call
  server/                 SERVER-ONLY — enforced by `server-only` imports
    ai/                   Bedrock client + the single extraction call
    extraction/           tinyfish · readability · fixture, behind one interface
    quality/              evidence · completeness · confidence · issues
    dedupe/               URL normalisation · fingerprint · duplicate matching
    pipeline/             runAnalysis — the orchestration
  schemas/                Zod: what the model may assert vs. what we persist
  helpers/                taxonomy · dates (moment) · formatting · errors
fixtures/                 deterministic demo content
docs/                     architecture · technical rationale
```

`services/` is the frontend API layer; `server/` is backend logic. Files in
`server/` import `server-only`, so accidentally importing one into a client
component is a build error rather than a leaked key.

## Notable implementation details

- **Two schemas, deliberately split.** `LlmExtractionSchema` is all the model
  may assert. `ExperienceSchema` is what we persist, and adds confidence,
  issues, duplicate flags and status — assembled server-side. The model cannot
  write its own quality score.
- **Controlled taxonomy.** Categories come from one frozen array that generates
  both the Zod enum and the prompt text, so the two can never drift.
- **Moment-bound date picker.** antd's `DatePicker` is dayjs-backed; rather than
  run two date libraries it's rebuilt against antd's moment generate config
  (`components/common/MomentDatePicker.jsx`), keeping `moment` as the single
  date library.
- **Store pinned to `globalThis`** so Next.js hot-reload doesn't silently empty
  it mid-demo.

## Known limitations

- **Records live in the browser** — the review queue is per-browser
  localStorage, so two reviewers don't share a queue and clearing site data
  clears the records. This is deliberate: the server is stateless, which is what
  serverless actually is, and it means a deployed demo works without
  provisioning a database. Production replaces it with the Postgres schema in
  [docs/architecture.md](docs/architecture.md); the store module is the seam.
- **Exact-match dedupe only** — won't catch reworded titles for the same event.
- **No authentication** — every visitor is an implicit reviewer.
- **Single-page extraction** — reads the URL given, doesn't follow "book here"
  links to find a price on another page.
- **Evidence verification is textual** — it proves a value was *stated on the
  page*, not that the page is telling the truth.
