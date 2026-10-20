# ML strategy

**Principle: the machine finds, Scripture speaks.** Every ML feature returns
real verses with references. Nothing generated is ever shown as, or mixed into,
the text of the Bible. Generated text is always labelled.

> **As built (2.0):** embeddings use bge-small-en-v1.5 through transformers.js,
> both offline (scripts/data/embed.mjs) and in the app, where a Web Worker
> embeds queries and scans 36,822 int8 vectors; no `ort` in Rust and no Python.
> Jev handles query routing and reranking only; a book's genre is a lookup table
> in code. **No large hosted model is used, by choice** (see section 3). The
> Lab's inspection tools (attention, logit lens, surprise) are in
> `python/biblelm/inspect_model.py`. Axon now has the transformer (branch
> `text-gpt`, v0.11.0: `axon new text`, same shape as `model.py`, `serve`
> streams characters); wiring the Lab's Training and Generate tabs to it is next.

## Which model for which job

| Job | Best tool | Why not the others |
|---|---|---|
| Exact lookup, counts, phrase search | Code (SQLite FTS5) | Rules and arithmetic stay in code. No model. |
| "Verses about X", "verses like this one", topic discovery | **Local sentence-embedding model** | The real win. Small, offline, deterministic, cites everything. |
| Rank or tag candidates, yes/no "is this passage about X" | **Jev (TypeSafe)** | A bounded judgment over a short list: exactly what Jev is for. |
| Explain a passage's context, draft a study outline | **Not done by a model.** The reader shows cross references, topics and parallel translations instead | Only a large model knows history and commentary; must be grounded and cited. |
| Learning how transformers work | **BibleLM's own GPT** (the Lab) | It is the best teacher and the worst oracle. Keep it in the Lab. |

### 1. Embeddings (do this first)

- Model: a small open sentence-embedding model exported to ONNX
  (`bge-small-en-v1.5` or `all-MiniLM-L6-v2`, 384 dims, about 30 to 130 MB).
- Precompute all verses once per translation (31,102 x 384, int8 quantised is
  about 12 MB). Embed passages too (sliding 3-verse windows), because single
  verses lose context.
- Query time: embed the query, cosine top-k, show results. Run in Rust with the
  `ort` crate (onnxruntime) so no Python is needed at runtime.
- Hybrid ranking: BM25 (FTS5) + embedding similarity fused with reciprocal rank
  fusion. Exact words still win when you type exact words.
- What it unlocks: topic search, "more like this", the Scripture map, chiasm and
  allusion finders ([IDEAS.md](IDEAS.md)).

### 2. Jev (bounded judgments)

Per the workspace rules: Jev ranks, routes and flags; it never writes text, and
`TYPESAFE_API_KEY` stays in the user's environment. If unset, the feature hides
and the app says so once.

- **Route a query**: reference lookup, exact phrase, or topic? (Saves a wrong
  search mode.)
- **Rerank** the top 30 embedding hits for a study question, returning a
  relevance level per verse.
- **Tag** Nave's-style topics onto passages that the topical index misses, to
  build a richer topic graph offline. Store the tags with their source.
- **Flag** whether a found passage is narrative, law, poetry, prophecy, epistle
  or apocalyptic, so results can be grouped by genre.

### 3. No hosted large model

Decided 2026-10-20: BibleLM does not call Claude Opus 5.5 or any larger hosted
model. Commentary-style help would be the one feature that needs one, and it
is left out; the app's machine help stays small (a local embedding model, Jev's
bounded judgments, its own GPT in the Lab). Do not add a hosted generative call
without asking.

### 4. The Lab (BibleLM's own GPT) and Axon

The Lab keeps training, inference and export. Two upgrades:

- **Move training to Axon.** Axon (`nexis-suite/nexis-ml-rs`, burn 0.21, wgpu)
  trains MLPs, CNNs and GBDTs today; its PLAN lists "a small transformer in
  burn" as the next text milestone. Porting `model.py` to burn is exactly that
  milestone and removes PyTorch from BibleLM. Ship the release of the unmerged
  `gbdt-trees` branch first so BibleLM pins a published Axon. Axon is driven
  over NDJSON already, which matches how BibleLM talks to Python today.
- **Make it educational instead of oracular:** attention-head viewer, logit lens
  per layer, per-verse perplexity ("which verses surprise the model most"),
  sampling temperature playground, side-by-side "model completion vs real
  verse" with the real verse always shown.

## Recommendation

Embeddings first (local, free, the biggest study win), Jev second (cheap,
bounded, improves ranking and routing). No hosted large model. The Lab
moves to Axon when Axon gains a transformer.
