# Computing ideas worth building

Algorithms and odd corners of computing that fit a study tool. Each says what
it would look like in the app. Ordered roughly from easiest to most ambitious.

## Text and search

- **Suffix array / FM-index.** Exact substring search over every translation at
  once in microseconds, with match counts for free. The data structure behind
  genome search tools. A Rust crate builds it at import time.
- **tf-idf distinctive words per book.** "Words Ecclesiastes uses far more than
  the rest of the Bible" (*vanity*, *under the sun*). A one-screen fingerprint
  for every book.
- **Collocations by PMI.** Words that travel together (*grace* and *peace*,
  *fear* and *Lord*). Shows idioms a concordance cannot.
- **Hapax legomena.** Words that occur exactly once. A classic scholarly list.
- **Zipf's law plot.** Word frequency vs rank on log axes is a near-straight line
  in every language. A small, beautiful demonstration in the Lab.

## Graphs

- **Cross-reference graph** (340k OpenBible links) as a network:
  - **Personalised PageRank** from a seed verse: a ranked "study walk" outward
    from John 3:16.
  - **Shortest paths** between two passages: how does Genesis 22 connect to
    John 19? (Typology, made visible.)
  - **Community detection (Leiden)**: clusters of mutually referencing passages
    are themes nobody had to label.
- **Arc diagram** of all cross references, books along the bottom, arcs between
  them. Chris Harrison's 2008 visualisation of this is famous; build a live,
  clickable one.

## Embedding space

- **The Scripture map.** Project every passage embedding to 2D with UMAP and
  draw it as a star field: Psalms in one constellation, Pauline letters in
  another, prophets between. Zoom, hover, click to read. Label clusters with Jev.
- **Chiasm finder.** Hebrew writers often built mirrored structures (A B C B' A').
  Build a verse-by-verse self-similarity matrix of a chapter from embeddings; a
  chiasm shows as an anti-diagonal. Same technique music software uses to find
  a song's chorus.
- **Allusion finder.** Where does the New Testament quote or echo the Old?
  Smith-Waterman local alignment (the DNA alignment algorithm) on word tokens
  finds quotations; embeddings find paraphrases.
- **Interpolation.** Walk the line between two verse embeddings and list the
  nearest verses along the way: a guided path between two ideas.

## The Lab

- **Logit lens.** Decode the hidden state after each layer to see the model's
  guess forming.
- **Attention heads.** Visualise which characters each head attends to. In char
  models you can often find a head that tracks verse numbers.
- **Per-verse perplexity.** The model's surprise at each real verse ranks the
  most "unusual" verses of the Bible by its own statistics.

## Honest statistics

- **The "Bible codes" lesson.** Equidistant letter sequences found hidden words
  in Genesis (1994), and McKay and others then found equally striking "codes"
  in *Moby-Dick*. Build the ELS search, then let the user run it on Moby-Dick
  too. A lesson in the look-elsewhere effect, which is a good way to keep
  computation in service of truth rather than superstition.
- **Stylometry (Burrows' Delta)**, shown with care: it measures style, not
  inspiration, and scholars disagree on what it proves.

## Memory and sync

- **FSRS spaced repetition** for memorising verses (the modern successor to
  Anki's SM-2).
- **CRDT notebooks (Automerge)**, later: edit the same notebook on two machines
  offline and merge without conflicts.
- **Content-addressed texts**: every translation is identified by the hash of its
  text, so a note records exactly which text it was written against.

## Art

- **Dithering is an algorithm.** Floyd-Steinberg (1976), Bayer matrices,
  Atkinson (Bill Atkinson, the original Mac) and void-and-cluster blue noise
  (Ulichney, 1993). Implementing all four in the art pipeline is a good small
  project in itself. See [ART.md](ART.md).

## As built

Every idea above is now in the app except where noted:

| Idea | Where |
|---|---|
| Suffix array | Search, "Count in every translation": a suffix array of word starts per translation in a worker (`src/lib/suffix.worker.ts`). Word starts rather than every character, and built in the app at first use rather than in Rust at import |
| tf-idf, PMI collocations, hapax legomena | Topics, Words (`src/lib/words.ts`) |
| Zipf's law | Lab, Lessons |
| PageRank study walk, shortest paths | Topics, Walk (already built) |
| Community detection | Topics, Links. Louvain with Leiden's connectivity guarantee (each community split into its connected parts) rather than full Leiden, at resolution 12, computed offline (`scripts/data/graph.mjs`) |
| Arc diagram | Topics, Links: chapters on a line, 12,000 strongest chapter pairs, hover lights a book |
| Scripture map, chiasm finder | Topics (already built) |
| Allusion finder | Topics, Echoes: Smith-Waterman over KJV words, seeded by rare shared three-word runs. Paraphrase without shared words is left to each verse's "More like this" |
| Interpolation | Topics, Walk, "Between two ideas" (`between` in `semantic.worker.ts`) |
| Logit lens, attention heads, per-verse perplexity | Lab, Inside (already built; perplexity is "Surprise") |
| Bible codes lesson | Lab, Lessons: the ELS search on Genesis and on Moby-Dick of equal length, beside the count chance predicts. On the English KJV, not the Hebrew |
| Burrows' Delta | Topics, Words, "Closest in style", with the caveat on screen |
| FSRS | Daily, By heart |
| CRDT notebooks | Notebooks, merge: a last-writer-wins state CRDT with tombstones instead of Automerge (STUDY.md) |
| Content-addressed texts | each translation's `hash`; wording notes record it |
| Four dithering algorithms | Floyd-Steinberg, Bayer, Atkinson and void-and-cluster blue noise, all live in `src/art/dither.ts` |

