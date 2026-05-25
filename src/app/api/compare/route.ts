import { NextRequest, NextResponse } from "next/server";
import { compareClauses } from "@/lib/clause-comparator";
import { scoreClause } from "@/lib/risk-scorer";
import { getKnowledgeNodes } from "@/lib/store";
import { DocumentChunk, ComparisonResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const {
      v1Chunks,
      v2Chunks,
    }: { v1Chunks: DocumentChunk[]; v2Chunks: DocumentChunk[] } =
      await req.json();

    if (!v1Chunks?.length || !v2Chunks?.length) {
      return NextResponse.json(
        { error: "Both document chunks required" },
        { status: 400 }
      );
    }

    const nodes = await getKnowledgeNodes();

    // Compare clause structures
    const results = compareClauses(v1Chunks, v2Chunks);

    // Score clauses that changed (for risk delta)
    const toScore: Array<{ result: ComparisonResult; side: "v1" | "v2" }> = [];
    for (const r of results) {
      if (r.matchType === "MODIFIED" || r.matchType === "ADDED" || r.matchType === "REMOVED") {
        if (r.chunkV1) toScore.push({ result: r, side: "v1" });
        if (r.chunkV2) toScore.push({ result: r, side: "v2" });
      }
    }

    // Score changed clauses
    const scoreMap = new Map<string, any>();
    for (let i = 0; i < toScore.length; i += 3) {
      const batch = toScore.slice(i, i + 3);
      await Promise.all(
        batch.map(async ({ result, side }) => {
          const chunk = side === "v1" ? result.chunkV1 : result.chunkV2;
          if (!chunk) return;
          const score = await scoreClause(chunk, nodes);
          scoreMap.set(`${chunk.id}`, score);
        })
      );
    }

    // Attach scores and compute risk delta
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

    return NextResponse.json({
      results,
      netDelta: totalDelta > 1 ? "INCREASED" : totalDelta < -1 ? "DECREASED" : "UNCHANGED",
      changedCount: results.filter((r) => r.matchType === "MODIFIED").length,
      addedCount: results.filter((r) => r.matchType === "ADDED").length,
      removedCount: results.filter((r) => r.matchType === "REMOVED").length,
    });
  } catch (err: any) {
    console.error("Compare error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
