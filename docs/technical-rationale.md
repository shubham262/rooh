# Technical rationale

## 1. The problem, as I read it

The assignment describes sourcing as manual work: find a page, read it, retype
it into a consistent shape, decide whether it belongs. The obvious automation —
point an LLM at a URL and write down what it says — fails for a reason that
matters more at rooh than at most companies. A hallucinated price or date does
not produce a broken page; it produces a person who travelled to the wrong place
at the wrong time expecting to pay the wrong amount. The cost of a plausible
error is much higher than the cost of a missing field.

So I did not treat this as an extraction problem. **The extraction is the easy
part; the hard part is knowing which extractions to trust.** That framing drove
every decision below.

## 2. The core decision: the LLM proposes, deterministic code decides

The model is asked for exactly four things: the fields, a description, a
category from a fixed list, and a relevance judgement. It is *not* asked how
confident it is.

That last point is the one I would defend hardest. A model asked to rate its own
output rates its own fluency — it is most confident precisely when it has
produced something coherent, which is exactly when a fabrication is hardest to
spot. Self-reported confidence is anti-correlated with the failure mode you
actually care about.

Instead, the model must return **a verbatim source snippet for every important
field** (price, start date, address, city, provider). Application code then
checks that each snippet actually appears in the fetched page. This is a string
comparison, and it converts an unfalsifiable claim into a testable one:

> ⚠ Price could not be verified from source evidence.

It catches two distinct failures. A *fabricated* quote — the model invented
supporting text — and an *unevidenced* value — the model produced a number and
offered no quote at all. Both surface identically to the reviewer, because both
mean the same thing: this value is not backed by the source.

Normalisation is deliberately narrow. Whitespace, curly quotes, dashes and
markdown emphasis are forgiven, because markdown extraction genuinely reflows
those. A changed digit or word still fails. Forgiving more would quietly defeat
the check.

Everything downstream of the model — completeness, validation, deduplication,
confidence, the issue list — is ordinary deterministic code. The same extraction
always produces the same scores and the same warnings, which is what makes the
output reviewable rather than merely plausible.

## 3. Build vs. buy

| Concern | Decision | Reasoning |
|---|---|---|
| JS-rendered page extraction | **Buy** — TinyFish Fetch API | Most event pages are client-rendered or bot-blocked. Measured on a live Eventbrite event: a plain fetch returns a 301 and 75 bytes, TinyFish returns 4,259 characters of real content. Running headless browsers is a permanent infrastructure cost that is nobody's differentiator. |
| Keyless fallback extraction | **Build** — fetch + Readability | Twenty lines, removes the hard dependency on one vendor, and keeps the app runnable with no keys at all. |
| Structured LLM output | **Buy** — Bedrock Converse tool schema | Constrained decoding against a schema beats parsing prose. Free with the API. |
| Relevance judgement | **Buy** — the model | Genuinely semantic. "Is a sound bath personal growth?" is not expressible as rules. |
| Confidence scoring | **Build** | See §2. This is the product. |
| Deduplication | **Build** — URL normalisation + hash | Exact-match catches the real V1 case (same event, different tracking params) at zero cost and full explainability. |
| Vector database | **Neither** | No semantic search requirement in V1. Adding one would be infrastructure serving a feature we don't have. |
| Crawler | **Neither** | Discovery is V2. Building a crawler before proving extraction quality optimises the wrong end of the funnel. |

## 4. Deliberate trade-offs

**Synchronous analysis, no job queue.** Fetch plus one model call is 5–15
seconds — short enough to wait on. I originally designed a job-and-poll pattern
to drive a six-step progress bar, then removed it: four of those six stages
complete in under 50 ms, so the bar would have been animation rather than
information, and a job store existing solely to power it is machinery serving
nothing. The queue becomes genuinely necessary at V2, when discovery submits
work in bulk.

**In-memory storage.** A deliberate POC choice to keep the demo to `npm run dev`
with nothing to provision. It costs persistence across restarts. The mitigation
is that all access goes through one repository module and the production DDL is
written (`docs/architecture.md`) — swapping in Postgres is replacing one file,
not a refactor.

**Exact-match deduplication.** Catches the same event submitted from different
URLs. It will *not* catch "Morning Breathwork" vs "Breathwork: Morning Session".
That's the known gap, and it's why embeddings are V4 rather than never — but
exact-match is explainable to a reviewer, and a reviewer who understands why two
records collided is more useful right now than a similarity threshold nobody can
reason about.

**One model call, not an agent.** There is no planning loop, no tool use, no
multi-agent decomposition, because the task doesn't need one: fetch a page,
extract from it, done. An agent would add latency, cost and non-determinism to a
problem that is fundamentally a single well-specified transformation.

## 5. Handling bad data

| Failure | Handling |
|---|---|
| **Incomplete** | `null`, never a guess. The prompt states this first and repeats it. Missing fields are listed for the reviewer and reduce completeness, but never block. |
| **Conflicting** | The model reports disagreements in `conflicts[]` rather than silently picking one. Surfaced verbatim and lowers confidence. |
| **Duplicated** | Flagged with a link to compare, never auto-merged or deleted. Deciding two records are the same is a judgement call, and getting it wrong silently loses data. |
| **Outdated** | A past start date raises a staleness issue. `content_hash` is stored now so V3 revalidation can detect page changes cheaply. |
| **Low-confidence** | Always visible, with the four sub-scores exposed so the number is explainable rather than oracular. |
| **Hallucinated** | Caught by evidence verification (§2) — the central mechanism. |
| **Malformed model output** | Zod validates the model's output, and validates our own assembled record again before persistence. |
| **Hostile URL** | SSRF guard: HTTP(S) only, no embedded credentials, DNS resolved and private/loopback/link-local/metadata ranges rejected. Page scripts are never executed. |

## 6. Where human review is non-negotiable

Every record enters `pending_review`. There is no code path that auto-approves,
regardless of score. That is a product position, not a technical limitation:
rooh's value is curation, and a platform that publishes unreviewed scraped
content is a directory, not a curated one.

What automation legitimately changes is the *cost* of review — from "read the
page and retype it" to "check five highlighted values and click approve". The
review UI is built around that: scores and issues above the fold, every value
sitting next to the quote it came from, and a standing reminder that the output
is a draft.

Confidence should eventually route rather than gate — high-confidence records to
a fast lane, low-confidence to careful review. I did not build routing because
the thresholds should come from measured reviewer behaviour, not from a number I
picked before anyone used it.

## 7. Intentionally out of scope

Personalization and recommendations (explicitly deferred by the brief),
authentication, a production CMS, automated discovery, background jobs, semantic
dedupe, and multi-agent orchestration. Each is in the V1–V5 path in
`docs/architecture.md` with a reason for its position.

## 8. What I would build first at rooh

**The ingestion-to-review loop over a narrow set of high-value sources** — three
or four platforms where rooh already finds good experiences — and then the
instrumentation to tell whether it works:

- **Extraction accuracy** per field, measured against reviewer corrections. Not
  an aggregate: knowing that *dates* are wrong 20% of the time is actionable in
  a way that "85% accurate" is not.
- **Reviewer acceptance rate** — approved without edits vs. corrected vs.
  rejected. The honest measure of whether the model output is useful.
- **Duplicate rate**, to show when exact-match stops being sufficient and
  earns the embedding work.
- **Correction rate by field**, which points directly at prompt changes.
- **Time saved per curated experience** against the manual baseline. This is the
  number that justifies the project.

The reason to build this first is that every later decision depends on it.
Whether to expand discovery, whether to auto-approve high-confidence records,
whether semantic dedupe is worth it — all of these are answerable with that data
and guesswork without it. Scaling discovery before knowing the acceptance rate
just produces more records nobody trusts.

Concretely: the audit trail already records every approve, reject and edit, so
the acceptance and correction metrics are a query away rather than a rebuild.
That is why it is in V1.
