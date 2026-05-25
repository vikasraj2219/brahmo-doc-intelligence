import { DocumentChunk, ComparisonResult, DiffPart, MatchType } from "./types";

// ─── Word-level diff ──────────────────────────────────────────────────────────

export function wordDiff(textA: string, textB: string): DiffPart[] {
  const wordsA = textA.split(/(\s+)/);
  const wordsB = textB.split(/(\s+)/);

  // Simple LCS-based word diff
  const lcs = computeLCS(wordsA, wordsB);
  const result: DiffPart[] = [];

  let i = 0,
    j = 0,
    k = 0;

  while (i < wordsA.length || j < wordsB.length) {
    if (k < lcs.length && i < wordsA.length && wordsA[i] === lcs[k] && j < wordsB.length && wordsB[j] === lcs[k]) {
      result.push({ type: "unchanged", text: wordsA[i] });
      i++; j++; k++;
    } else if (j < wordsB.length && (k >= lcs.length || wordsB[j] !== lcs[k])) {
      result.push({ type: "added", text: wordsB[j] });
      j++;
    } else if (i < wordsA.length) {
      result.push({ type: "removed", text: wordsA[i] });
      i++;
    }
  }

  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  // For performance, cap at 200 words per side
  const A = a.slice(0, 200);
  const B = b.slice(0, 200);
  const m = A.length, n = B.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (A[i - 1] === B[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1]) { lcs.unshift(A[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return lcs;
}

// ─── Text similarity (Jaccard on bigrams) ────────────────────────────────────

function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;

  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    const words = s.split(" ");
    for (let i = 0; i < words.length - 1; i++) {
      set.add(`${words[i]} ${words[i + 1]}`);
    }
    return set;
  };

  const setA = bigrams(na);
  const setB = bigrams(nb);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ─── Normalize clause number for matching ────────────────────────────────────

function normalizeNumber(n: string): string {
  return n.replace(/\.$/, "").trim().toLowerCase();
}

// ─── Main comparator ──────────────────────────────────────────────────────────

export function compareClauses(
  v1Chunks: DocumentChunk[],
  v2Chunks: DocumentChunk[]
): ComparisonResult[] {
  const results: ComparisonResult[] = [];
  const v1Used = new Set<string>();
  const v2Used = new Set<string>();

  // ── Pass 1: Heading-based match (same clause number) ─────────────────────
  for (const c1 of v1Chunks) {
    for (const c2 of v2Chunks) {
      if (v2Used.has(c2.id)) continue;
      const n1 = normalizeNumber(c1.clauseNumber);
      const n2 = normalizeNumber(c2.clauseNumber);
      if (n1 === n2 && n1 !== "") {
        const sim = textSimilarity(c1.text, c2.text);
        const matchType: MatchType = sim >= 0.95 ? "UNCHANGED" : "MODIFIED";
        const diffParts = matchType === "MODIFIED" ? wordDiff(c1.text, c2.text) : undefined;
        results.push({ chunkV1: c1, chunkV2: c2, matchType, similarityScore: sim, diffParts });
        v1Used.add(c1.id);
        v2Used.add(c2.id);
        break;
      }
    }
  }

  // ── Pass 2: Title-based match (same title, different number — renumbered) ──
  for (const c1 of v1Chunks) {
    if (v1Used.has(c1.id)) continue;
    for (const c2 of v2Chunks) {
      if (v2Used.has(c2.id)) continue;
      const t1 = c1.clauseTitle.toLowerCase().trim();
      const t2 = c2.clauseTitle.toLowerCase().trim();
      if (t1 === t2 && t1.length > 3) {
        const sim = textSimilarity(c1.text, c2.text);
        const matchType: MatchType = sim >= 0.95 ? "UNCHANGED" : "MODIFIED";
        const diffParts = matchType === "MODIFIED" ? wordDiff(c1.text, c2.text) : undefined;
        results.push({ chunkV1: c1, chunkV2: c2, matchType, similarityScore: sim, diffParts });
        v1Used.add(c1.id);
        v2Used.add(c2.id);
        break;
      }
    }
  }

  // ── Pass 3: Semantic match (content similarity > 0.6 — catches restructured) ──
  for (const c1 of v1Chunks) {
    if (v1Used.has(c1.id)) continue;

    let bestSim = 0;
    let bestC2: DocumentChunk | null = null;

    for (const c2 of v2Chunks) {
      if (v2Used.has(c2.id)) continue;
      const sim = textSimilarity(c1.text, c2.text);
      if (sim > bestSim) {
        bestSim = sim;
        bestC2 = c2;
      }
    }

    if (bestC2 && bestSim >= 0.4) {
      const matchType: MatchType = bestSim >= 0.95 ? "UNCHANGED" : "MODIFIED";
      const diffParts = matchType === "MODIFIED" ? wordDiff(c1.text, bestC2.text) : undefined;

      // Detect SPLIT: one v1 clause maps to multiple v2 clauses
      const splitDetected =
        normalizeNumber(c1.clauseNumber) !== normalizeNumber(bestC2.clauseNumber) &&
        bestSim >= 0.4;

      results.push({
        chunkV1: c1,
        chunkV2: bestC2,
        matchType,
        similarityScore: bestSim,
        diffParts,
        splitDetected,
      });
      v1Used.add(c1.id);
      v2Used.add(bestC2.id);
    }
  }

  // ── Pass 4: REMOVED — v1 clauses with no v2 match ────────────────────────
  for (const c1 of v1Chunks) {
    if (!v1Used.has(c1.id)) {
      results.push({
        chunkV1: c1,
        chunkV2: undefined,
        matchType: "REMOVED",
        similarityScore: 0,
      });
    }
  }

  // ── Pass 5: ADDED — v2 clauses with no v1 match ──────────────────────────
  for (const c2 of v2Chunks) {
    if (!v2Used.has(c2.id)) {
      results.push({
        chunkV1: undefined,
        chunkV2: c2,
        matchType: "ADDED",
        similarityScore: 0,
      });
    }
  }

  // Sort: show MODIFIED + ADDED + REMOVED first, then UNCHANGED
  return results.sort((a, b) => {
    const order: Record<MatchType, number> = { MODIFIED: 0, ADDED: 1, REMOVED: 2, UNCHANGED: 3 };
    return order[a.matchType] - order[b.matchType];
  });
}
