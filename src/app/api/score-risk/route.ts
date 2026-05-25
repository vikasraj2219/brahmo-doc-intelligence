import { NextRequest, NextResponse } from "next/server";
import { scoreClause } from "@/lib/risk-scorer";
import { getKnowledgeNodes, saveRiskScore } from "@/lib/store";
import { DocumentChunk } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { chunks }: { chunks: DocumentChunk[] } = await req.json();

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ error: "No chunks provided" }, { status: 400 });
    }

    const nodes = await getKnowledgeNodes();

    // Score all clauses (with concurrency limit of 3)
    const scores = [];
    for (let i = 0; i < chunks.length; i += 3) {
      const batch = chunks.slice(i, i + 3);
      const batchScores = await Promise.all(
        batch.map((chunk) => scoreClause(chunk, nodes))
      );
      scores.push(...batchScores);
    }

    // Save scores
    await Promise.all(scores.map((s) => saveRiskScore(s)));

    const summary = {
      high: scores.filter((s) => s.riskLevel === "HIGH").length,
      medium: scores.filter((s) => s.riskLevel === "MEDIUM").length,
      low: scores.filter((s) => s.riskLevel === "LOW").length,
    };

    return NextResponse.json({ scores, summary });
  } catch (err: any) {
    console.error("Scoring error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
