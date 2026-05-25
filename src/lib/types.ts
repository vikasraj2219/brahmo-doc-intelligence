// ─── Core Types ─────────────────────────────────────────────────────────────

export type ClauseType =
  | "definition"
  | "obligation"
  | "limitation"
  | "termination"
  | "indemnity"
  | "ip"
  | "confidentiality"
  | "dispute"
  | "non_compete"
  | "payment"
  | "general";

export type MatchType = "UNCHANGED" | "MODIFIED" | "ADDED" | "REMOVED";

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type NodeType = "CONSTRAINT" | "ANTI_PATTERN" | "DECISION";

// ─── Document Chunk (Clause) ─────────────────────────────────────────────────

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  clauseNumber: string;
  clauseTitle: string;
  clauseType: ClauseType;
  text: string;
}

// ─── Risk Score ───────────────────────────────────────────────────────────────

export interface RiskFactor {
  description: string;
  scoreImpact: number;
}

export interface ConstraintViolation {
  nodeId: string;
  nodeTitle: string;
  reason: string;
  overrideLevel: RiskLevel;
}

export interface RiskScore {
  chunkId: string;
  score: number; // 1-10
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  constraintViolations: ConstraintViolation[];
  recommendation: string;
}

// ─── Comparison ───────────────────────────────────────────────────────────────

export interface DiffPart {
  type: "added" | "removed" | "unchanged";
  text: string;
}

export interface ComparisonResult {
  chunkV1?: DocumentChunk;
  chunkV2?: DocumentChunk;
  matchType: MatchType;
  similarityScore: number;
  diffParts?: DiffPart[];
  riskV1?: RiskScore;
  riskV2?: RiskScore;
  riskDelta?: "INCREASED" | "DECREASED" | "UNCHANGED";
  riskDeltaAmount?: number;
  splitDetected?: boolean; // for semantic matching of restructured clauses
}

// ─── Knowledge Node ───────────────────────────────────────────────────────────

export interface KnowledgeNode {
  id: string;
  nodeType: NodeType;
  title: string;
  content: string;
  practiceArea: string;
  tags: string[];
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
  contentText: string;
  chunks?: DocumentChunk[];
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface UploadResponse {
  document: Document;
  chunks: DocumentChunk[];
}

export interface RiskResponse {
  chunks: DocumentChunk[];
  scores: RiskScore[];
  summary: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface CompareResponse {
  results: ComparisonResult[];
  netDelta: "INCREASED" | "DECREASED" | "UNCHANGED";
  changedCount: number;
  addedCount: number;
  removedCount: number;
}
