# Shadow evaluation: search with and without Jev (M9)

Run 2026-10-22 with `node scripts/bench/shadow.ts`, model alias `jev-latest`.

30 study questions, typed as a person would. For each, the app's semantic
candidates (top 20 by meaning over the 66 books, bge-small-en-v1.5, exactly
what SearchView hands to Jev) are scored in two orders against hand-labelled
passages: **without Jev** (embedding order) and **with Jev** (the app's
`decideRerank` over Jev's relevance scores). Jev can only reorder; it cannot
add a passage the embeddings missed, so both orders share the same
candidates. Relevance is binary: a candidate inside a labelled passage.

| Metric | Without Jev | With Jev | Change |
|---|---|---|---|
| MRR@10 | 0.32 | 0.55 | +0.23 |
| Precision@5 | 0.12 | 0.22 | +0.10 |
| nDCG@10 | 0.33 | 0.55 | +0.22 |

Jev improved nDCG@10 on 16 questions, made it worse on 1, and left
13 unchanged. Labelled passages among the 20
candidates: 41 in all, 9 questions with none (no reordering can help those).

| Question | Labelled in top 20 | nDCG@10 without | with | First result without | with |
|---|---|---|---|---|---|
| how can I be forgiven | 1 | 0.29 | 0.50 | 2 Corinthians 2:10 | Hosea 14:2 |
| what does God say about worry | 0 | 0.00 | 0.00 | Genesis 8:15 | Luke 12:22 |
| how do I resist temptation | 3 | 0.91 | 0.91 | 1 Corinthians 10:13 | Matthew 26:41 |
| why does God allow suffering | 0 | 0.00 | 0.00 | 1 Peter 4:19 | Luke 24:26 |
| how should I pray | 3 | 0.51 | 0.84 | 1 Corinthians 14:15 | Matthew 6:9 |
| what is faith | 3 | 0.47 | 0.86 | Romans 10:17 | Hebrews 11:1 |
| how to deal with anger | 2 | 0.61 | 0.65 | Psalms 37:8 | Psalms 37:8 |
| what happens after death | 1 | 0.00 | 0.43 | Romans 8:13 | Isaiah 26:19 |
| how do I find peace | 1 | 0.33 | 1.00 | Psalms 34:14 | John 14:27 |
| is it wrong to lie | 0 | 0.00 | 0.00 | Leviticus 18:23 | Proverbs 19:9 |
| how should husbands treat their wives | 4 | 0.67 | 1.00 | Colossians 3:19 | Colossians 3:19 |
| what does the Bible say about money | 1 | 0.39 | 1.00 | Deuteronomy 14:26 | 1 Timothy 6:10 |
| how can I be saved | 0 | 0.00 | 0.00 | Luke 18:26 | Romans 10:13 |
| what is love | 5 | 0.93 | 0.77 | 1 John 4:16 | 1 John 4:16 |
| how do I overcome fear | 0 | 0.00 | 0.00 | 1 Peter 3:2 | Deuteronomy 31:6 |
| why should I forgive others | 2 | 0.41 | 1.00 | Luke 11:4 | Mark 11:25 |
| what is the purpose of my life | 0 | 0.00 | 0.00 | John 6:48 | Philippians 1:21 |
| how should I treat my enemies | 4 | 0.31 | 1.00 | Psalms 25:19 | Luke 6:27 |
| what does God say about pride | 1 | 1.00 | 1.00 | James 4:6 | James 4:6 |
| how do I stay pure | 1 | 1.00 | 1.00 | Psalms 119:9 | Psalms 119:9 |
| what is the Holy Spirit | 1 | 0.00 | 0.00 | 1 John 5:6 | 1 John 5:6 |
| how can I be content | 2 | 0.61 | 0.79 | Philippians 4:11 | Philippians 4:11 |
| what does the Bible say about loneliness | 0 | 0.00 | 0.00 | Genesis 2:18 | Genesis 2:18 |
| why did Jesus die | 1 | 0.29 | 1.00 | John 11:13 | 1 Peter 3:18 |
| how should I raise children | 0 | 0.00 | 0.00 | Jeremiah 29:6 | Deuteronomy 11:19 |
| what does God say about laziness | 0 | 0.00 | 0.00 | John 6:28 | John 6:28 |
| how do I know God's will | 1 | 0.43 | 0.50 | John 7:17 | John 7:17 |
| is drinking alcohol a sin | 1 | 0.00 | 1.00 | Romans 6:15 | Ephesians 5:18 |
| how do I grieve someone I lost | 1 | 0.00 | 0.33 | 2 Corinthians 2:2 | Isaiah 51:19 |
| what is grace | 2 | 0.61 | 0.83 | Psalms 106:3 | Romans 3:24 |

The labels are the passages a study Bible would point to first, so a strong
result outside them counts as a miss for both orders alike.
