# Tuning the Lab's model

The objective is the Generate tab's own judge: Jev scores each generated
passage 0 to 3 for **sounds like the KJV** and 0 to 3 for **makes sense**
(`JUDGE_QUESTIONS` in `src/lib/jev-contracts.ts`). We maximize their sum.

## Sampling (2026-10-21)

The trained model in `runs/current` (4 layers, 256 wide, 3.2M parameters,
validation loss 1.224), unchanged. Every setting sees the same four prompts
and the same random draws, four samples each, 220 characters.

```sh
python -m biblelm.sample_grid --run-dir runs/current > data/tune/samples.jsonl
node scripts/bench/tune-sampling.ts data/tune/samples.jsonl
```

| Temperature | Top-k | Style | Sense | Sum (± s.e.) | Distinct 4-grams |
|---|---|---|---|---|---|
| 0.2 | 10 | 1.76 | 1.01 | 2.77 ± 0.11 | 0.84 |
| 0.3 | 10 | 1.80 | 1.03 | 2.82 ± 0.08 | 0.87 |
| **0.4** | **10** | **1.79** | **0.98** | **2.78 ± 0.09** | **0.95** |
| 0.5 | 10 | 1.74 | 0.95 | 2.69 ± 0.08 | 0.98 |
| 0.6 | 10 | 1.67 | 0.88 | 2.56 ± 0.07 | 0.98 |
| 0.8 | 40 (old default) | 1.54 | 0.70 | 2.23 ± 0.07 | 1.00 |
| 1.0 | 10 | 1.51 | 0.62 | 2.13 ± 0.07 | 1.00 |
| 1.2 | off | 1.29 | 0.44 | 1.73 ± 0.04 | 1.00 |

- **Temperature is what matters.** Both scores fall steadily as it rises.
  Top-k (off, 10, 20, 40) moves the sum by 0.05 at most, inside the noise.
- **The peak is flat from 0.2 to 0.4**, but below 0.4 the model starts to loop
  ("the son of Joshua the son of Josiah the son of Joshua...", a sixth of its
  four-word runs repeated), which the judge barely penalizes.
- **New defaults: temperature 0.4, top-k 10**, up from 0.8 and 40: the sum rises
  from 2.23 to 2.78, about 25%, with almost no repetition.

Sense tops out near 1 of 3 at any setting: the sentences are KJV-shaped but
rarely coherent. That ceiling is the model's, not the sampler's; raising it
means training differently (more layers, a longer context, more steps), which
the same judge can measure.

## Training (2026-10-21)

Four configs against the base run, each trained 10 epochs on `data/kjv.txt`,
then sampled at the new defaults (and at 0.6 as a check) with the same prompts
and draws, six samples per prompt, and scored by the same judge.

```sh
python -m biblelm.train --corpus data/kjv.txt --run-dir runs/sweep/deep --epochs 10 \
  --n-layers 6 --d-model 384 --n-heads 6 --dropout 0.1
python -m biblelm.sample_grid --run-dir runs/sweep/deep --temperatures 0.4,0.6 --top-ks 10 --per 6 > data/tune/run-deep.jsonl
node scripts/bench/tune-sampling.ts data/tune/run-deep.jsonl
```

| Run | Shape | Params | Best val loss | Train time | Sum at 0.4 (± s.e.) | Sum at 0.6 |
|---|---|---|---|---|---|---|
| base (`runs/current`) | 4 × 256, context 256 | 3.2M | 1.224 | 2 min | 2.75 ± 0.10 | 2.55 |
| drop | base + dropout 0.1 | 3.2M | 1.227 | 2 min | 2.62 ± 0.08 | 2.60 |
| ctx | base + context 512, dropout 0.1 | 3.3M | 1.326 | 3 min | 2.52 ± 0.09 | 2.32 |
| **deep** | **6 × 384, 6 heads, dropout 0.1** | **10.8M** | **1.158** | **6 min** | **2.92 ± 0.06** | **2.75** |
| big | 8 × 512, 8 heads, dropout 0.2 | 25.4M | 1.176 | 12 min | 2.84 ± 0.10 | 2.71 |

- **Width and depth help; dropout alone does not.** Dropout 0.1 on the small
  model only narrows the gap between training and validation loss; the judge
  scores it a little lower.
- **A longer context hurts at a fixed number of epochs**: each step sees twice
  the text, so it takes half the steps and ends undertrained (val loss 1.33).
- **deep is the winner**: the lowest validation loss and the best sum, with
  sense passing 1 of 3 (1.09) for the first time. big is no better for twice
  the parameters and time; it would need more epochs or less dropout.
- The judge still marks everything below "most sentences make sense". The
  samples are fluent KJV phrasing with drifting meaning (genealogies that
  wander, "the children of Israel the children of Israel").

**Promoted:** `runs/sweep/deep` is now `runs/current` (the old run is kept in
`runs/base-4x256`), and Training defaults to 6 layers, d_model 384, 6 heads,
dropout 0.1 (`DEFAULT_TRAIN_CONFIG`, and the trainer's own defaults).
