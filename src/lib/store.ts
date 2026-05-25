import { DocumentChunk, RiskScore, ComparisonResult, Document } from "./types";
import { FIRM_KNOWLEDGE_NODES } from "./risk-scorer";

// ─── Try to init Supabase ─────────────────────────────────────────────────────

let supabaseClient: any = null;

async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "your_url") return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
    return null;
  }
}

// ─── Document CRUD ────────────────────────────────────────────────────────────

export async function saveDocument(doc: Document): Promise<void> {
  const sb = await getSupabase();
  if (!sb) throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  await sb.from("documents").upsert({
    id: doc.id,
    filename: doc.filename,
    uploaded_at: doc.uploadedAt,
    content_text: doc.contentText,
  });
}

export async function saveChunks(chunks: DocumentChunk[]): Promise<void> {
  const sb = await getSupabase();
  if (!sb) throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  if (chunks.length === 0) return;
  await sb.from("document_chunks").upsert(
    chunks.map((c) => ({
      id: c.id,
      document_id: c.documentId,
      chunk_index: c.chunkIndex,
      clause_number: c.clauseNumber,
      clause_title: c.clauseTitle,
      clause_type: c.clauseType,
      text: c.text,
    }))
  );
}

export async function saveRiskScore(score: RiskScore): Promise<void> {
  const sb = await getSupabase();
  if (!sb) throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  await sb.from("risk_scores").upsert({
    chunk_id: score.chunkId,
    score: score.score,
    risk_level: score.riskLevel,
    risk_factors: score.riskFactors,
    constraint_violations: score.constraintViolations,
    recommendation: score.recommendation,
  });
}

export async function getKnowledgeNodes() {
  const sb = await getSupabase();
  if (sb) {
    const { data } = await sb.from("knowledge_nodes").select("*");
    if (data && data.length > 0) return data;
  }
  // Return built-in firm nodes if database not available or table empty
  return FIRM_KNOWLEDGE_NODES;
}

export async function getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
  const sb = await getSupabase();
  if (!sb) throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const { data } = await sb
    .from("document_chunks")
    .select("*")
    .eq("document_id", documentId)
    .order("chunk_index");
  if (data) return data.map(dbToChunk);
  return [];
}

export async function getRiskScores(chunkIds: string[]): Promise<RiskScore[]> {
  const sb = await getSupabase();
  if (!sb) throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const { data } = await sb.from("risk_scores").select("*").in("chunk_id", chunkIds);
  return (data || []).map((row: any) => ({
    chunkId: row.chunk_id,
    score: row.score,
    riskLevel: row.risk_level,
    riskFactors: row.risk_factors,
    constraintViolations: row.constraint_violations,
    recommendation: row.recommendation,
  })) as RiskScore[];
}

function dbToChunk(row: any): DocumentChunk {
  return {
    id: row.id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    clauseNumber: row.clause_number,
    clauseTitle: row.clause_title,
    clauseType: row.clause_type,
    text: row.text,
  };
}
