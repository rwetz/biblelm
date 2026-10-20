// Word-level diff (longest common subsequence) for comparing translations.

export type DiffPart = { kind: "same" | "add" | "del"; text: string };

export function wordDiff(a: string, b: string): DiffPart[] {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
  const key = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = key(A[i]) === key(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = out[out.length - 1];
    if (last?.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (key(A[i]) === key(B[j])) { push("same", B[j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", A[i++]);
    else push("add", B[j++]);
  }
  while (i < n) push("del", A[i++]);
  while (j < m) push("add", B[j++]);
  return out;
}
