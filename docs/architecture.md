# Architecture: BRAHMO Document Intelligence

## Overview

A legal document intelligence system that extracts clauses, compares versions, and scores risk using firm-specific knowledge nodes. Built on Next.js + TypeScript + Supabase + Claude API.

---

## Chunking Approach

### Why Legal-Aware Chunking?

Generic text splitters (every N tokens) destroy legal clause structure. A clause that spans 3 paragraphs would be split mid-sentence, and two separate clauses could be merged. The comparator then fails because it can't match broken fragments.

### Clause Boundary Detection

The chunker (`src/lib/legal-chunker.ts`) identifies boundaries using 4 regex patterns applied line by line:

1. **Numbered headings** — `1.`, `2.3`, `10.` followed by a capitalized title
2. **Article/Section markers** — `ARTICLE IV`, `CLAUSE 3`, `SECTION 5`
3. **UPPERCASE standalone titles** — `CONFIDENTIALITY`, `INDEMNIFICATION` (min 5 chars, no digits)
4. **Schedule/Annexure markers** — `SCHEDULE A`, `ANNEXURE 1`, `EXHIBIT B`

These patterns are **universal** across contract types — NDA, employment, SPA, lease, shareholders' agreement. They don't hardcode expected clause titles.

### Fallback

If zero headings are detected (rare flat document), the chunker falls back to paragraph-based chunking (split on double newlines), ensuring something is always returned.

### Sub-clause handling

Sub-clauses (5.1, 5.1.1) are detected by the same numbered regex and become their own chunks. This allows fine-grained comparison — if 5.1 changes but 5.2 doesn't, only 5.1 is flagged.

---

## Matching Strategy

The comparator (`src/lib/clause-comparator.ts`) runs 5 passes:

### Pass 1: Heading Match
Match clauses with identical clause numbers (e.g., both have clause `5.2`). This handles 90% of cases in well-structured documents.

### Pass 2: Title Match
Match clauses with identical titles (case-insensitive) even if renumbered. Handles documents where counterparty renumbered all clauses.

### Pass 3: Semantic Match (Jaccard Bigram Similarity)
For unmatched clauses, compute pairwise similarity using bigrams of normalized text. If similarity > 0.4, treat as a match (MODIFIED or UNCHANGED at >0.95). This catches:
- Restructured clauses (SPA Clause 8 → 8 + 8A): the original content maps to the closest match
- Reworded clauses with same intent

The `splitDetected` flag is set when clause numbers differ but content matches — identifying splits vs deletions.

### Pass 4 & 5: REMOVED / ADDED
Unmatched v1 clauses = REMOVED. Unmatched v2 clauses = ADDED.

### Sort order
Results sorted: MODIFIED → ADDED → REMOVED → UNCHANGED (most important changes first).

---

## Risk Scoring

### LLM-Powered (Claude Sonnet)

Each clause is sent to Claude with:
1. A system prompt containing all 10 firm knowledge nodes
2. The risk scoring rubric (specific point values per risk factor)
3. The clause text and metadata

Claude returns structured JSON with score, risk factors, and triggered constraint violations.

### Rule-Based Fallback

If no API key is configured, `fallbackScore()` applies deterministic regex patterns for the most common risk factors. The fallback covers all 10 constraint nodes and produces valid risk scores.

### Firm Knowledge Override

The key BRAHMO advantage: CONSTRAINT nodes override generic risk analysis. "24-month non-solicitation" scores HIGH because C-011 fires ("max 12 months"), regardless of generic rubric. This is what differentiates the system from generic AI tools.

---

## Risk Delta

After comparison, each MODIFIED clause gets:
- `riskV1`: score before change
- `riskV2`: score after change
- `riskDelta`: INCREASED / DECREASED / UNCHANGED
- `riskDeltaAmount`: numeric delta

Net delta across all changes = `netDelta` shown in the comparison header.

---

## Scalability (200 documents)

The architecture supports batch processing with zero code changes:
- Same chunker, same scorer — no contract-type-specific code
- Concurrency: batch `scoreClause()` calls in groups of 3 (configurable)
- For 200 documents: wrap the upload/chunk/score pipeline in a queue processor
- Risk matrix: aggregate scores across all 200, group by clause type, surface cross-document patterns

The surprise test (new contract type) works because:
- Chunker uses structural patterns, not contract-type-specific titles
- Comparator uses content similarity, not hardcoded clause lists
- Risk scorer uses general rubric + firm constraints, not per-type rules

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) with in-memory fallback |
| Text Extraction | mammoth (DOCX), pdf-parse (PDF) |
| Diff Algorithm | Custom LCS word-level diff |
| Similarity | Jaccard bigram similarity |
| Risk Scoring | Claude Sonnet API + rule-based fallback |
| Styling | Tailwind CSS |

---

## File Structure

```
src/lib/
  types.ts              — All TypeScript interfaces
  legal-chunker.ts      — Clause boundary detection (THE critical module)
  clause-comparator.ts  — 5-pass matching + word-level diff
  risk-scorer.ts        — LLM scoring + CONSTRAINT node injection
  document-processor.ts — DOCX/PDF text extraction
  store.ts              — Supabase + in-memory fallback store

src/app/api/
  upload/route.ts       — File upload → extract → chunk
  score-risk/route.ts   — Batch clause scoring
  compare/route.ts      — Clause comparison + risk delta
  knowledge/route.ts    — Knowledge node listing

src/components/
  DocumentUpload.tsx    — Drag-and-drop file upload
  RiskHeatmap.tsx       — Sorted clause list with risk indicators
  ComparisonView.tsx    — Side-by-side with word-level diffs
  KnowledgePanel.tsx    — Firm knowledge nodes with triggered highlights
```
