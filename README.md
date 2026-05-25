# BRAHMO Document Intelligence

Legal contract comparison and risk scoring system. Upload one contract for instant risk assessment, or upload two versions for clause-by-clause comparison with word-level diffs and firm-knowledge-driven risk scoring.

---

## Features

- **Legal-aware clause extraction** — detects numbered headings, UPPERCASE titles, Schedule markers (works on any contract type)
- **Clause comparison** — heading match + title match + semantic similarity (catches restructured/split clauses)
- **Word-level diffs** — red strikethrough for removed text, green highlight for added text
- **Firm knowledge risk scoring** — 10 CONSTRAINT/ANTI_PATTERN/DECISION nodes override generic AI analysis
- **Risk delta** — shows whether changes increased or decreased overall risk
- **Zero hardcoding** — works on NDAs, employment agreements, SPAs, leases, shareholders' agreements without code changes

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from supabase.com → project → Settings → API
- `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `GROQ_API_KEY` — optional (rule-based fallback works without them)

> **No API key?** The system works without one using rule-based risk scoring. All 10 firm constraints still fire correctly.

### 3. Set up Supabase (optional)

In Supabase SQL Editor, run:
```
supabase/schema.sql   ← create tables
supabase/seed.sql     ← load 10 knowledge nodes
```

> **No Supabase?** The system works with in-memory storage. Data resets on server restart.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Test Documents

The `test-documents/` folder contains 4 .txt contracts ready for upload:

| File | Use |
|------|-----|
| `nda_v1.txt` | NDA with risky clauses (uncapped liability, arbitration) |
| `nda_v2.txt` | NDA v2 with 4 changes (liability capped, term extended, non-solicitation added, arbitration removed) |
| `employment_v1.txt` | Employment agreement |
| `employment_v2.txt` | With 3 changes (non-compete 12→18 months, notice 90→30 days, remote work added) |

---

## Demo Scenarios

### Scenario 1: NDA Risk Assessment
Upload `nda_v1.txt` → see risk heatmap with firm constraints triggered

### Scenario 2: NDA Comparison
Upload `nda_v1.txt`, then `nda_v2.txt` → all 4 changes detected with word-level diffs

Expected findings:
- §5.2 MODIFIED — liability capped (risk DECREASED) 
- §6 MODIFIED — term extended 3→5 years
- §11A ADDED — non-solicitation 24 months → C-011 triggered (HIGH risk)
- §8.2 MODIFIED — arbitration removed → C-013 triggered

### Scenario 3: Employment Agreement
Upload `employment_v1.txt` → `employment_v2.txt`
- Non-compete 12→18 months → C-011 triggered
- Termination notice 90→30 days → C-014 triggered
- Remote work clause added

---

## Architecture

See `docs/architecture.md` for detailed explanation of:
- Clause boundary detection algorithm
- 5-pass matching strategy (heading → title → semantic → removed → added)
- Risk scoring with firm constraint override
- Scalability to 200+ documents

---

## Project Structure

```
src/lib/
  types.ts              — TypeScript interfaces
  legal-chunker.ts      — Clause boundary detection
  clause-comparator.ts  — Matching + word-level diff
  risk-scorer.ts        — LLM + rule-based scoring
  document-processor.ts — DOCX/PDF text extraction
  store.ts              — Supabase + in-memory store

src/app/api/            — Next.js API routes
src/components/         — React UI components
supabase/               — Schema + seed SQL
test-documents/         — Sample contracts
docs/                   — Architecture notes
```
