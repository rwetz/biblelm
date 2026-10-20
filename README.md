<div align="center">

<img src="public/icon.svg" width="80" height="80" alt="BibleLM" />

# BibleLM

**An illustrated Bible study tool, with a language model trained from scratch inside it.**

Tauri 2 · React 19 · @nexis/design · transformers.js · PyTorch

</div>

---

BibleLM is two things in one window. A **study Bible**: six public-domain
translations, all 241 of Gustave Doré's 1866 Bible engravings set beside the
verses they depict, cross references, a topical index, search by meaning, and
notebooks for your own studies. And a **lab**: a small GPT you train from
scratch on Scripture and can look inside, layer by layer.

The rule throughout: **the machine finds, Scripture speaks.** Every ML feature
returns real verses with their references. Anything generated is labelled, and
never shown as Scripture.

## Study

| Page | What it does |
|---|---|
| **Home** | Verse of the day in blackletter, under a dithered Doré scene that follows the church year |
| **Read** | Any chapter in KJV (with the 1611 Apocrypha), WEB, ASV, Douay-Rheims, Brenton Septuagint or the Vulgate; parallel and two-column reading; Doré's plates at their verses; tap a verse for cross references, topics, similar verses, a word-level comparison across translations, and your notes |
| **Search** | A reference, a word, a question ("how many times does grace appear"), or what you mean in your own words ("when I feel anxious"), matched by a small embedding model that runs on your computer |
| **Topics** | 6,712 topics; *study walks* (personalised PageRank over 341,000 cross references); the strongest chain between two passages; a map of every verse placed by meaning; a chiasm finder for mirrored Hebrew structure |
| **Notebooks** | One per study, each with its own translations, canon and cover plate; notes anchored to verses so they follow the text into every translation; Markdown export; daily backups |

Canon is a shelf: the Protestant 66 by default; the Deuterocanon and the
Apocrypha are a switch away, always marked, never mixed into your results.

## Lab

Train a 3.2M-parameter character-level GPT on any Bible translation and watch
the loss fall live; generate KJV-sounding text (clearly labelled); export to
ONNX; and look inside: every attention head, the logit lens (the model's guess
after each layer), and which real verses surprise it most. The Lab needs Python
and PyTorch; nothing else in the app does.

## Optional machine help

- **Jev** (TypeSafe): routes queries and reranks results with bounded
  judgments, using `TYPESAFE_API_KEY` from your own environment.

No large hosted model is used: everything else runs on your computer.

## Run it

```sh
pnpm install
pnpm data          # builds texts, plates and the semantic index (a few minutes, once)
pnpm dev           # the study app, in a browser
pnpm tauri dev     # the desktop app, with the Lab
```

For the Lab, add a Python 3.13 venv at `.venv` with `python/requirements.txt`
and a PyTorch build (CUDA recommended). See [docs/DATA.md](docs/DATA.md) and
[AGENTS.md](AGENTS.md).

## Credits

Texts: public domain, from [eBible.org](https://ebible.org). Cross references
and topics: [OpenBible.info](https://www.openbible.info), CC-BY. Illustrations:
Gustave Doré, *La Grande Bible de Tours* (1866), public domain, via Wikimedia
Commons ([list](docs/art-credits.md)). Embeddings: BAAI bge-small-en-v1.5 (MIT).
Faces: UnifrakturMaguntia, Grenze Gotisch, IM Fell English, EB Garamond (OFL).

## License

[MIT](LICENSE).
