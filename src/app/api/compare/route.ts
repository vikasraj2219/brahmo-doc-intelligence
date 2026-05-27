import { NextRequest, NextResponse } from "next/server";
import { compareClauses } from "@/lib/clause-comparator";
import { scoreClause } from "@/lib/risk-scorer";
import { getKnowledgeNodes } from "@/lib/store";
import { DocumentChunk } from "@/lib/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const { v1Chunks, v2Chunks }: { v1Chunks: DocumentChunk[]; v2Chunks: DocumentChunk[] } =
      await req.json();

    if (!v1Chunks?.length || !v2Chunks?.length) {
      return NextResponse.json({ error: "Both document chunks required" }, { status: 400 });
    }

    console.log(`Comparing: v1 has ${v1Chunks.length} chunks, v2 has ${v2Chunks.length} chunks`);

    const nodes = await getKnowledgeNodes();

    // ── Step 1: Compare clause structures ──────────────────────────────────
    const results = compareClauses(v1Chunks, v2Chunks);
    console.log(`Comparison produced ${results.length} results:`, 
      results.map(r => `${r.matchType}:${r.chunkV1?.clauseNumber || r.chunkV2?.clauseNumber}`).join(", ")
    );

    // ── Step 2: Collect all unique chunks to score ──────────────────────────
    const scoreMap = new Map<string, any>();
    const seen = new Set<string>();
    const toScore: DocumentChunk[] = [];

    for (const r of results) {
      if (r.chunkV1 && !seen.has(r.chunkV1.id)) { seen.add(r.chunkV1.id); toScore.push(r.chunkV1); }
      if (r.chunkV2 && !seen.has(r.chunkV2.id)) { seen.add(r.chunkV2.id); toScore.push(r.chunkV2); }
    }

    console.log(`Scoring ${toScore.length} unique chunks...`);

    // ── Step 3: Score one at a time with 300ms gap (safe for all free tiers) ─
    for (let i = 0; i < toScore.length; i++) {
      const chunk = toScore[i];
      try {
        const score = await scoreClause(chunk, nodes);
        scoreMap.set(chunk.id, score);
        console.log(`Scored ${i + 1}/${toScore.length}: ${chunk.clauseTitle} → ${score.riskLevel} (${score.score}/10)`);
      } catch (err) {
        console.warn(`Score failed for ${chunk.clauseTitle}:`, err);
      }
      if (i < toScore.length - 1) await delay(300);
    }

    // ── Step 4: Attach scores + compute risk delta ──────────────────────────
    let totalDelta = 0;

    for (const r of results) {
      if (r.chunkV1) r.riskV1 = scoreMap.get(r.chunkV1.id);
      if (r.chunkV2) r.riskV2 = scoreMap.get(r.chunkV2.id);

      if (r.riskV1 && r.riskV2) {
        const delta = r.riskV2.score - r.riskV1.score;
        r.riskDeltaAmount = delta;
        r.riskDelta = delta > 0.5 ? "INCREASED" : delta < -0.5 ? "DECREASED" : "UNCHANGED";
        totalDelta += delta;
      } else if (r.matchType === "ADDED" && r.riskV2) {
        r.riskDelta = "INCREASED";
        r.riskDeltaAmount = r.riskV2.score;
        totalDelta += r.riskV2.score * 0.5;
      } else if (r.matchType === "REMOVED" && r.riskV1) {
        r.riskDelta = "DECREASED";
        r.riskDeltaAmount = -r.riskV1.score;
        totalDelta -= r.riskV1.score * 0.3;
      }
    }

    const response = {
      results,
      netDelta: totalDelta > 1 ? "INCREASED" : totalDelta < -1 ? "DECREASED" : "UNCHANGED",
      changedCount: results.filter((r) => r.matchType === "MODIFIED").length,
      addedCount:   results.filter((r) => r.matchType === "ADDED").length,
      removedCount: results.filter((r) => r.matchType === "REMOVED").length,
    };

    console.log(`Compare complete: ${response.changedCount} modified, ${response.addedCount} added, ${response.removedCount} removed`);
    return NextResponse.json(response);

  } catch (err: any) {
    console.error("Compare error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}