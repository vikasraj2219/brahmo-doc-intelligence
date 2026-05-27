# BRAHMO — Document Intelligence

A legal contract comparison and risk scoring system. Upload one contract for instant risk assessment, or upload two versions for clause-by-clause comparison with word-level diffs and firm-knowledge-driven risk scoring.

---

## What It Does

**Mode A — Single Document Risk Assessment**
Upload any contract (DOCX, PDF, TXT) → system extracts all clauses → scores each clause 1-10 for risk → displays a colour-coded heatmap (RED = high risk, ORANGE = medium, GREEN = low).

**Mode B — Two Document Comparison**
Upload v1 then v2 of any contract → system finds every change (MODIFIED, ADDED, REMOVED) → shows word-level diffs (red strikethrough = removed, green highlight = added) → calculates whether net risk INCREASED or DECREASED.

**The BRAHMO Advantage**
Generic AI tools say "this clause is risky." BRAHMO says "this clause violates firm policy C-011 — non-compete exceeds 12 months, must be negotiated down." Firm-specific knowledge nodes override generic AI analysis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) — optional, works without it |
| Text Extraction | mammoth (DOCX), pdf-parse (PDF) |
| AI Risk Scoring | Groq (Llama 3.3) / Gemini / Anthropic / OpenAI |
| Styling | Tailwind CSS |

---

## Setup Instructions

### Prerequisites

- Node.js v18 or higher — download from https://nodejs.org
- Git — download from https://git-scm.com
- A free Groq API key — get from https://console.groq.com/keys

### Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd brahmo-doc-intelligence
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Configure Environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and add your API key:

```
# Add at least ONE of these — Groq is recommended (free, no credit card)
GROQ_API_KEY=gsk_your_groq_key_here

# Optional — other providers tried in order if Groq fails
GEMINI_API_KEY=AIza_your_gemini_key_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
OPENAI_API_KEY=sk-your_key_here

# Optional — Supabase (app works without this, uses in-memory storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **No API key?** The system works with rule-based fallback scoring. All 10 firm constraints still fire correctly — it just won't use AI for nuanced analysis.

### Step 4 — Set Up Supabase (Optional)

If you want persistent storage:

1. Go to supabase.com → create free account → create project
2. Go to SQL Editor → paste and run `supabase/schema.sql`
3. Then paste and run `supabase/seed.sql` (loads 10 firm knowledge nodes)
4. Go to Settings → API → copy Project URL and anon key into `.env.local`

If you skip this step, the app uses in-memory storage (data resets on server restart, fine for demo).

### Step 5 — Run

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## How to Get Free API Keys

| Provider | Link | Notes |
|---|---|---|
| **Groq** (recommended) | https://console.groq.com/keys | No credit card, generous free tier |
| **Gemini** | https://aistudio.google.com/apikey | Google account required |
| **Anthropic** | https://console.anthropic.com | $5 free credit on new account |
| **OpenAI** | https://platform.openai.com | $5 free credit on new account |

---

## Test Documents

The `test-documents/` folder contains ready-to-use contracts:

| File | Purpose |
|---|---|
| `nda_v1.txt` | NDA with risky clauses (unlimited liability, SIAC arbitration) |
| `nda_v2.txt` | Revised NDA — 4 known changes (liability capped, term extended, arbitration removed, non-solicitation added) |
| `employment_v1.txt` | Employment agreement v1 |
| `employment_v2.txt` | Employment agreement v2 — 3 known changes (non-compete 12→18 months, notice 90→30 days, remote work added) |

### Demo Scenario 1 — NDA Comparison (upload nda_v1.txt → nda_v2.txt)

Expected results — all 4 changes detected:

| Clause | Change | Risk |
|---|---|---|
| §5.2 Liability | unlimited → capped at 2x | Risk ↓ (good change) |
| §6.1 Term | 3 years → 5 years | Risk ↑ |
| §8.2 Governing Law | SIAC arbitration → Delhi courts | **C-013 triggered** ↑ |
| §11A Non-Solicitation | ADDED — 24 months | **C-011 triggered HIGH** ↑↑ |
| **Net** | | **INCREASED** |

### Demo Scenario 2 — Employment Comparison (upload employment_v1.txt → employment_v2.txt)

Expected results — all 3 changes detected:

| Clause | Change | Risk |
|---|---|---|
| §6.1 Non-Compete | 12 → 18 months | **C-011 triggered HIGH** ↑ |
| §8.2 Termination | 90 → 30 days notice | **C-014 triggered** ↑ |
| §14 Remote Work | ADDED | LOW ↑ |
| **Net** | | **INCREASED** |

---

## Project Structure

```
brahmo-doc-intelligence/
├── README.md                          ← You are here
├── data_sources.md                    ← Knowledge node sources
├── .env.local.example                 ← Copy to .env.local and fill in keys
├── package.json
├── src/
│   ├── app/
│   │   ├── page.tsx                   ← Main UI (state machine)
│   │   └── api/
│   │       ├── upload/route.ts        ← File upload → extract → chunk
│   │       ├── compare/route.ts       ← Clause comparison + risk delta
│   │       ├── score-risk/route.ts    ← Batch clause scoring
│   │       └── knowledge/route.ts     ← Firm knowledge node listing
│   ├── lib/
│   │   ├── types.ts                   ← TypeScript interfaces
│   │   ├── document-processor.ts      ← DOCX/PDF/TXT text extraction
│   │   ├── legal-chunker.ts           ← Clause boundary detection
│   │   ├── clause-comparator.ts       ← 5-pass matching + word diff
│   │   ├── risk-scorer.ts             ← LLM + rule-based scoring
│   │   └── store.ts                   ← Supabase + in-memory fallback
│   └── components/
│       ├── DocumentUpload.tsx          ← Drag-and-drop upload
│       ├── RiskHeatmap.tsx             ← Clause list with risk colours
│       ├── ComparisonView.tsx          ← Side-by-side diff view
│       └── KnowledgePanel.tsx          ← Firm rules sidebar
├── supabase/
│   ├── schema.sql                     ← Database table definitions
│   └── seed.sql                       ← 10 firm knowledge nodes
├── test-documents/                    ← Sample contracts for demo
└── docs/
    └── architecture.md                ← Chunking + matching strategy
```

---

## Architecture Summary

### 1. Legal-Aware Chunker (most critical module)
Splits contracts at clause boundaries using 4 regex patterns:
- Numbered headings: `1.`, `5.2`, `11A.`
- Article/Section markers: `ARTICLE IV`, `SECTION 3`
- UPPERCASE titles: `CONFIDENTIALITY`, `INDEMNIFICATION`
- Schedule markers: `SCHEDULE A`, `ANNEXURE 1`

Works on any contract type — NDA, employment, SPA, lease — with zero hardcoding.

### 2. Clause Comparator (5-pass matching)
1. Match by clause number (same `5.2` in both)
2. Match by clause title (handles renumbered documents)
3. Match by content similarity — Jaccard bigram algorithm (catches split/restructured clauses)
4. Unmatched v1 clauses = REMOVED
5. Unmatched v2 clauses = ADDED

### 3. Risk Scorer (AI + firm rules)
- Sends each clause to AI with all 10 firm knowledge nodes as system prompt
- Pre-detects constraint violations from text using regex (independent of AI)
- Merges AI response with pre-detected violations
- Applies firm overrides: C-011 violation always forces score ≥ 7 (HIGH), regardless of AI opinion

### 4. Surprise Document Test
Upload any new contract type (lease, shareholders' agreement, services agreement) — the chunker finds boundaries, the comparator matches clauses, the risk scorer applies firm constraints. Zero code changes needed.

---

## Scalability — 200 Documents

Same architecture, add a batch wrapper:

```
for each document (5 in parallel):
  extract → chunk → score → store
aggregate risk across all 200
export risk matrix: high/medium/low per clause type
```

No retraining, no contract-type-specific code, no hardcoding.

---

## Submission Checklist

- [x] README with setup instructions
- [x] `.env.local.example`
- [x] `supabase/schema.sql`
- [x] `supabase/seed.sql` (10 knowledge nodes)
- [x] Legal-aware chunker (not generic text splitting)
- [x] Comparison finds changes between two contract versions
- [x] Risk scorer uses firm CONSTRAINT nodes
- [x] Risk heatmap (red/orange/green)
- [x] Side-by-side comparison with word-level diffs
- [x] Risk delta shown (NET INCREASED/DECREASED)
- [x] Handles new contract types (surprise-ready)
- [x] `docs/architecture.md`