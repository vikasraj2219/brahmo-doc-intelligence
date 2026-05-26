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

    // Score clauses one at a time with a 300ms gap between requests.
    // This prevents bursting the free-tier rate limits on Groq (12k TPM)
    // and Gemini (15 RPM). Slower but reliable.
    const scores = [];
    for (let i = 0; i < chunks.length; i++) {
      const score = await scoreClause(chunks[i], nodes);
      scores.push(score);
      if (i < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
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