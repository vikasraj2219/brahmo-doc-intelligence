# Data Sources — BRAHMO Document Intelligence

This document explains the origin of every piece of data used in the system: the 10 firm knowledge nodes, the test contracts, and the risk scoring rubric.

---

## 1. Firm Knowledge Nodes (10 nodes)

The 10 knowledge nodes are **firm-internal policies and past case learnings** provided directly in the assessment specification (`ASSESSMENT_05_SETUP_GUIDE.md`). They are not sourced from external databases — they represent the fictional BRAHMO law firm's internal rules for the purpose of this assessment.

### CONSTRAINT Nodes (firm policies)

| Node ID | Title | Source | Basis in Real Legal Practice |
|---|---|---|---|
| C-010 | Liability Cap | Assessment Setup Guide (seed data) | Standard commercial contract practice — liability caps at 1x–2x contract value are industry norm in Indian corporate law; see Indian Contract Act 1872 §73–74 on damages |
| C-011 | Non-Compete Duration | Assessment Setup Guide (seed data) | Indian courts routinely strike down non-competes exceeding 12 months as unreasonable restraint of trade under §27 of the Indian Contract Act 1872 |
| C-012 | IP Assignment Carve-Out | Assessment Setup Guide (seed data) | Best practice in technology contracts — pre-existing IP carve-outs are standard in employment and services agreements globally |
| C-013 | Arbitration Clause | Assessment Setup Guide (seed data) | SIAC (Singapore International Arbitration Centre) Rules are a common choice for Indian cross-border contracts; reflects Arbitration and Conciliation Act 1996 (amended 2021) |
| C-014 | Termination Notice | Assessment Setup Guide (seed data) | 90-day notice for senior positions is standard in Indian employment law and reflects typical market practice for professional services firms |

### ANTI_PATTERN Nodes (past mistakes to avoid)

| Node ID | Title | Source | Basis |
|---|---|---|---|
| AP-010 | One-Sided Indemnification | Assessment Setup Guide (seed data) | Fictional past case provided in assessment — reflects common vendor contract risk pattern in Indian commercial law |
| AP-011 | Auto-Renewal Short Opt-Out | Assessment Setup Guide (seed data) | Fictional past case provided in assessment — short opt-out windows (30 days) are a known commercial trap in subscription and services contracts |

### DECISION Nodes (past case learnings)

| Node ID | Title | Source | Basis |
|---|---|---|---|
| D-010 | Return of Materials | Assessment Setup Guide (seed data) | Fictional case "TechCorp NDA (2026)" provided in assessment — reflects real legal principle: trade secret protection requires confidentiality + return obligations |
| D-011 | Liquidated Damages Proportionality | Assessment Setup Guide (seed data) | Fictional case "Sharma Services Agreement (2025)" — reflects real principle from Fateh Chand v Balkishan Das (1964 SC) and ONGC v Saw Pipes (2003 SC) on penalty clauses |
| D-012 | Dispute Resolution Clarity | Assessment Setup Guide (seed data) | Fictional case "ABC Cross-Border (2026)" — reflects real practice benefit of clear SIAC clauses upheld in Indian courts under Arbitration Act 1996 |

---

## 2. Test Contract Documents

All test contracts are **synthetically generated** for this assessment. They do not contain real party names, real financial data, or confidential information.

| File | Type | How Created | Known Changes |
|---|---|---|---|
| `nda_v1.txt` | Non-Disclosure Agreement v1 | Generated for assessment demo purposes | Baseline — contains unlimited liability, SIAC arbitration |
| `nda_v2.txt` | Non-Disclosure Agreement v2 | Generated for assessment demo purposes | 4 changes: liability capped, term extended, arbitration removed, non-solicitation added |
| `employment_v1.txt` | Employment Agreement v1 | Generated for assessment demo purposes | Baseline — 12-month non-compete, 90-day notice |
| `employment_v2.txt` | Employment Agreement v2 | Generated for assessment demo purposes | 3 changes: non-compete 18 months, notice 30 days, remote work added |

The contract text follows standard Indian commercial contract drafting conventions. Clause structures (numbered headings, UPPERCASE titles) reflect common Indian legal document formatting.

---

## 3. Risk Scoring Rubric

The risk scoring rubric (point values per risk factor) was provided directly in the assessment specification:

| Risk Factor | Score Impact | Source |
|---|---|---|
| Uncapped liability | +3 | Assessment Setup Guide — Risk Scoring Rubric section |
| One-sided indemnification | +2 | Assessment Setup Guide — Risk Scoring Rubric section |
| Non-compete > 12 months | +2 | Assessment Setup Guide — Risk Scoring Rubric section |
| Missing IP carve-out | +2 | Assessment Setup Guide — Risk Scoring Rubric section |
| No dispute resolution | +1 | Assessment Setup Guide — Risk Scoring Rubric section |
| Auto-renewal short opt-out | +1 | Assessment Setup Guide — Risk Scoring Rubric section |
| Termination notice < 90 days | +1 | Assessment Setup Guide — Risk Scoring Rubric section |
| Missing return of materials | +1 | Assessment Setup Guide — Risk Scoring Rubric section |
| Disproportionate liquidated damages | +2 | Assessment Setup Guide — Risk Scoring Rubric section |

Score ranges (1–3 LOW, 4–6 MEDIUM, 7–10 HIGH) are also from the assessment specification.

---

## 4. AI Models Used

The system uses third-party AI APIs for clause risk scoring. No training data was created or used — these are inference-only API calls.

| Provider | Model | Purpose | Free Tier |
|---|---|---|---|
| Groq | llama-3.3-70b-versatile | Primary risk scorer | Yes — console.groq.com |
| Google | gemini-2.0-flash | Fallback scorer | Yes — aistudio.google.com |
| Anthropic | claude-haiku-4-5 | Fallback scorer | $5 credit on new account |
| OpenAI | gpt-4o-mini | Fallback scorer | $5 credit on new account |

---

## 5. Libraries and Dependencies

All open-source, no proprietary data:

| Library | Purpose | License | Source |
|---|---|---|---|
| mammoth | DOCX text extraction | MIT | https://github.com/mwilliamson/mammoth.js |
| pdf-parse | PDF text extraction | MIT | https://www.npmjs.com/package/pdf-parse |
| @supabase/supabase-js | Database client | MIT | https://github.com/supabase/supabase-js |
| Next.js | React framework | MIT | https://github.com/vercel/next.js |
| Tailwind CSS | Styling | MIT | https://github.com/tailwindlabs/tailwindcss |
| uuid | ID generation | MIT | https://github.com/uuidjs/uuid |

---

## 6. No External Clinical or Medical Data

This project is a **legal document intelligence system**. It does not use any clinical data, medical databases, patient records, or health information. All data in the system is:

- Firm policy rules (provided in assessment specification)
- Synthetic legal contracts (generated for demo purposes)
- Risk scoring rubric (provided in assessment specification)
- Open-source software libraries (listed above)

---

*data_sources.md — BRAHMO Document Intelligence Assessment*
*All fictional case names, party names, and contract terms are for demonstration purposes only.*