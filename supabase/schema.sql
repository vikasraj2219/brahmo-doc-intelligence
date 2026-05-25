-- BRAHMO Document Intelligence — Supabase Schema

-- Knowledge nodes (firm policies, anti-patterns, decisions)
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL CHECK (node_type IN ('CONSTRAINT', 'ANTI_PATTERN', 'DECISION')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  practice_area TEXT NOT NULL DEFAULT 'corporate',
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Uploaded documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  content_text TEXT NOT NULL
);

-- Document chunks (individual clauses)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  clause_number TEXT,
  clause_title TEXT,
  clause_type TEXT,
  text TEXT NOT NULL
);

-- Risk scores per chunk
CREATE TABLE IF NOT EXISTS risk_scores (
  chunk_id UUID PRIMARY KEY REFERENCES document_chunks(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 10),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW')),
  risk_factors JSONB DEFAULT '[]'::jsonb,
  constraint_violations JSONB DEFAULT '[]'::jsonb,
  recommendation TEXT,
  scored_at TIMESTAMPTZ DEFAULT now()
);

-- Comparison results between two document versions
CREATE TABLE IF NOT EXISTS comparison_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_v1_id UUID REFERENCES documents(id),
  doc_v2_id UUID REFERENCES documents(id),
  chunk_v1_id UUID REFERENCES document_chunks(id),
  chunk_v2_id UUID REFERENCES document_chunks(id),
  match_type TEXT NOT NULL CHECK (match_type IN ('UNCHANGED', 'MODIFIED', 'ADDED', 'REMOVED')),
  similarity_score FLOAT,
  diff_text TEXT,
  risk_delta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_type ON document_chunks(clause_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_nodes USING gin(tags);
