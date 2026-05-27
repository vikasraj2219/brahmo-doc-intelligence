import { DocumentChunk, RiskScore, RiskLevel, KnowledgeNode } from "./types";

// ─── Firm knowledge nodes (fallback if Supabase unavailable) ─────────────────

export const FIRM_KNOWLEDGE_NODES: KnowledgeNode[] = [
  {
    id: "C-010",
    nodeType: "CONSTRAINT",
    title: "Liability Cap",
    content:
      "Firm policy: liability in any contract must be capped at maximum 2x the annual contract value. Uncapped liability = automatic HIGH risk flag.",
    practiceArea: "corporate",
    tags: ["contract", "liability"],
  },
  {
    id: "C-011",
    nodeType: "CONSTRAINT",
    title: "Non-Compete Duration",
    content:
      "Firm policy: non-compete and non-solicitation clauses must not exceed 12 months. Any duration > 12 months must be rejected or negotiated down.",
    practiceArea: "corporate",
    tags: ["contract", "non_compete"],
  },
  {
    id: "C-012",
    nodeType: "CONSTRAINT",
    title: "IP Assignment Carve-Out",
    content:
      "Firm policy: IP assignment clauses must include carve-out for pre-existing IP. Broad 'all IP' assignments without carve-out = HIGH risk.",
    practiceArea: "corporate",
    tags: ["contract", "ip"],
  },
  {
    id: "C-013",
    nodeType: "CONSTRAINT",
    title: "Arbitration Clause",
    content:
      "Firm policy: arbitration (SIAC or LCIA rules) preferred over litigation for cross-border contracts. Removal of arbitration clause = flag for review.",
    practiceArea: "corporate",
    tags: ["contract", "dispute"],
  },
  {
    id: "C-014",
    nodeType: "CONSTRAINT",
    title: "Termination Notice",
    content:
      "Firm policy: termination for convenience must have minimum 90 days notice. Shorter notice periods disadvantage our clients.",
    practiceArea: "corporate",
    tags: ["contract", "termination"],
  },
  {
    id: "AP-010",
    nodeType: "ANTI_PATTERN",
    title: "One-Sided Indemnification",
    content:
      "Don't accept one-sided indemnification in vendor contracts. Past case: client liable for vendor's data breach because indemnity was one-way. Always insist on mutual indemnification.",
    practiceArea: "corporate",
    tags: ["contract", "indemnity"],
  },
  {
    id: "AP-011",
    nodeType: "ANTI_PATTERN",
    title: "Auto-Renewal Short Opt-Out",
    content:
      "Watch for auto-renewal clauses with short opt-out windows. Past case: client locked into 3-year renewal because opt-out was 30 days and they missed it. Flag any opt-out < 90 days.",
    practiceArea: "corporate",
    tags: ["contract", "auto_renewal"],
  },
  {
    id: "D-010",
    nodeType: "DECISION",
    title: "Return of Materials",
    content:
      "TechCorp NDA (2026): Client lost trade secret protection because NDA had no 'return of materials' clause. Now MANDATORY: every NDA must include return/destruction of confidential materials on termination.",
    practiceArea: "corporate",
    tags: ["nda", "materials"],
  },
  {
    id: "D-011",
    nodeType: "DECISION",
    title: "Liquidated Damages Proportionality",
    content:
      "Sharma Services Agreement (2025): Liquidated damages clause struck down as 'penalty' because amount was disproportionate (10x breach value). Lesson: keep LD clauses proportionate to actual estimated loss.",
    practiceArea: "corporate",
    tags: ["contract", "penalty"],
  },
  {
    id: "D-012",
    nodeType: "DECISION",
    title: "Dispute Resolution Clarity",
    content:
      "ABC Cross-Border (2026): Won jurisdiction challenge because contract specified SIAC Singapore. Opponent tried Indian courts — dismissed. Lesson: clear dispute resolution clause saves months of fighting.",
    practiceArea: "corporate",
    tags: ["contract", "jurisdiction"],
  },
];

// ─── Risk level from score ────────────────────────────────────────────────────

function scoreToLevel(score: number): RiskLevel {
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

// ─── Build system prompt with firm constraints ────────────────────────────────

function buildSystemPrompt(nodes: KnowledgeNode[]): string {
  const constraints = nodes
    .map((n) => `[${n.id}] ${n.nodeType} — ${n.title}: ${n.content}`)
    .join("\n");

  return `You are a legal risk analyst for BRAHMO law firm. Analyze contract clauses and score them for risk.

FIRM KNOWLEDGE BASE (these OVERRIDE generic analysis):
${constraints}

RISK SCORING RUBRIC:
- Uncapped liability: +3 points
- One-sided indemnification: +2 points  
- Non-compete > 12 months: +2 points
- Missing IP carve-out: +2 points
- No dispute resolution clause: +1 point
- Auto-renewal with short opt-out (<90 days): +1 point
- Termination notice < 90 days: +1 point
- Missing return of materials in NDA: +1 point
- Disproportionate liquidated damages: +2 points

SCORE RANGES: 1-3 = LOW, 4-6 = MEDIUM, 7-10 = HIGH

IMPORTANT: If a CONSTRAINT node applies, use it to override. For example, "24-month non-solicitation" should be flagged with C-011 and scored HIGH regardless of generic rubric.

Respond ONLY with valid JSON. No markdown, no preamble:
{
  "score": <number 1-10>,
  "riskLevel": "<HIGH|MEDIUM|LOW>",
  "riskFactors": [{ "description": "<what makes it risky>", "scoreImpact": <number> }],
  "constraintViolations": [{ "nodeId": "<C-010>", "nodeTitle": "<title>", "reason": "<why triggered>", "overrideLevel": "<HIGH|MEDIUM|LOW>" }],
  "recommendation": "<1-2 sentence action>"
}`;
}

// ─── Parse JSON safely from LLM text ─────────────────────────────────────────

function parseScore(chunkId: string, raw: string): RiskScore | null {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    // Extract the first {...} block in case there's stray text
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.score !== "number") return null;
    return {
      chunkId,
      score: parsed.score,
      riskLevel: parsed.riskLevel || scoreToLevel(parsed.score),
      riskFactors: parsed.riskFactors || [],
      constraintViolations: parsed.constraintViolations || [],
      recommendation: parsed.recommendation || "",
    };
  } catch {
    return null;
  }
}

// ─── Provider 1: Anthropic Claude ────────────────────────────────────────────

async function scoreWithAnthropic(
  chunk: DocumentChunk,
  nodes: KnowledgeNode[],
  apiKey: string
): Promise<RiskScore | null> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", // fast + cheap, perfect for scoring
      max_tokens: 1000,
      system: buildSystemPrompt(nodes),
      messages: [
        {
          role: "user",
          content: `Analyze this contract clause for risk:\n\nClause ${chunk.clauseNumber}: ${chunk.clauseTitle}\nType: ${chunk.clauseType}\n\n${chunk.text}`,
        },
      ],
    }),
  });

  const data = await resp.json();
  if (data.error) {
    console.warn("Anthropic error:", data.error.message);
    return null;
  }
  const text = data.content?.[0]?.text || "";
  return parseScore(chunk.id, text);
}

// ─── Provider 2: OpenAI ───────────────────────────────────────────────────────

async function scoreWithOpenAI(
  chunk: DocumentChunk,
  nodes: KnowledgeNode[],
  apiKey: string
): Promise<RiskScore | null> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(nodes) },
        {
          role: "user",
          content: `Analyze this contract clause for risk:\n\nClause ${chunk.clauseNumber}: ${chunk.clauseTitle}\nType: ${chunk.clauseType}\n\n${chunk.text}`,
        },
      ],
      max_tokens: 100000,
      temperature: 0,
    }),
  });

  const data = await resp.json();
  if (data.error) {
    console.warn("OpenAI error:", data.error.message);
    return null;
  }
  const text = data.choices?.[0]?.message?.content || "";
  return parseScore(chunk.id, text);
}

// ─── Provider 3: Gemini ───────────────────────────────────────────────────────

async function scoreWithGemini(
  chunk: DocumentChunk,
  nodes: KnowledgeNode[],
  apiKey: string
): Promise<RiskScore | null> {
  // Official Gemini REST endpoint
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const fullPrompt = buildSystemPrompt(nodes) +
    `\n\nAnalyze this contract clause for risk:\n\nClause ${chunk.clauseNumber}: ${chunk.clauseTitle}\nType: ${chunk.clauseType}\n\n${chunk.text}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0 },
    }),
  });

  const data = await resp.json();
  if (data.error) {
    console.warn("Gemini error:", data.error.message);
    return null;
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseScore(chunk.id, text);
}

// ─── Provider 4: Groq ─────────────────────────────────────────────────────────

async function scoreWithGroq(
  chunk: DocumentChunk,
  nodes: KnowledgeNode[],
  apiKey: string
): Promise<RiskScore | null> {
  // Correct Groq API endpoint (OpenAI-compatible)
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", // current supported Groq model
      messages: [
        { role: "system", content: buildSystemPrompt(nodes) },
        {
          role: "user",
          content: `Analyze this contract clause for risk:\n\nClause ${chunk.clauseNumber}: ${chunk.clauseTitle}\nType: ${chunk.clauseType}\n\n${chunk.text}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0,
    }),
  });

  const data = await resp.json();
  if (data.error) {
    console.warn("Groq error:", data.error.message);
    return null;
  }
  const text = data.choices?.[0]?.message?.content || "";
  return parseScore(chunk.id, text);
}

// ─── Main scorer: try providers in order, fallback to rules ──────────────────
//
// Priority order (set whichever key(s) you have in .env.local):
//   1. ANTHROPIC_API_KEY  — Claude Haiku (fast, cheap, reliable JSON)
//   2. OPENAI_API_KEY     — GPT-4o-mini
//   3. GEMINI_API_KEY     — Gemini 1.5 Flash (free tier)
//   4. GROQ_API_KEY       — Llama3 via Groq (free tier)
//   5. Rule-based fallback — no API key needed

export async function scoreClause(
  chunk: DocumentChunk,
  nodes: KnowledgeNode[]
): Promise<RiskScore> {
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Try each provider in order
  const providers: Array<() => Promise<RiskScore | null>> = [];

  if (groqKey) {
    providers.push(() => scoreWithGroq(chunk, nodes, groqKey));
  }
  if (anthropicKey) {
    providers.push(() => scoreWithAnthropic(chunk, nodes, anthropicKey));
  }
  if (openaiKey) {
    providers.push(() => scoreWithOpenAI(chunk, nodes, openaiKey));
  }
  if (geminiKey) {
    providers.push(() => scoreWithGemini(chunk, nodes, geminiKey));
  }


  for (const provider of providers) {
    try {
      const result = await provider();
      if (result) return result; // success — return immediately
    } catch (err) {
      console.warn("Provider failed, trying next:", (err as Error).message);
    }
  }

  // All providers failed or none configured — use rule-based scoring
  console.log("All LLM providers unavailable — using rule-based fallback scorer");
  return fallbackScore(chunk, nodes);
}

// ─── Fallback rule-based scoring (no API key needed) ─────────────────────────

function fallbackScore(chunk: DocumentChunk, nodes: KnowledgeNode[]): RiskScore {
  // Include clause title so "NON-COMPETE" heading + "18 months" body both match
  const text = (chunk.clauseTitle + " " + chunk.text).toLowerCase();
  let score = 1;
  const riskFactors = [];
  const constraintViolations = [];

  if (/unlimited liability|no cap|uncapped/.test(text)) {
    score += 3;
    riskFactors.push({ description: "Uncapped or unlimited liability", scoreImpact: 3 });
    const node = nodes.find((n) => n.id === "C-010");
    if (node)
      constraintViolations.push({
        nodeId: "C-010",
        nodeTitle: node.title,
        reason: "Liability appears uncapped; firm policy requires cap at 2x annual value",
        overrideLevel: "HIGH" as RiskLevel,
      });
  }

  if (/\b(1[3-9]|2\d)\s*months?\b/.test(text) && /non.?solicit|non.?compet|not to engage|not to compete/.test(text)) {
    score += 2;
    riskFactors.push({ description: "Non-compete/non-solicitation exceeds 12 months", scoreImpact: 2 });
    const node = nodes.find((n) => n.id === "C-011");
    if (node)
      constraintViolations.push({
        nodeId: "C-011",
        nodeTitle: node.title,
        reason: "Duration exceeds firm's 12-month maximum",
        overrideLevel: "HIGH" as RiskLevel,
      });
  }

  if (/all\s+ip|all intellectual property|assigns.*all/.test(text) && !/carve.?out|pre.?existing/.test(text)) {
    score += 2;
    riskFactors.push({ description: "Broad IP assignment without pre-existing IP carve-out", scoreImpact: 2 });
    const node = nodes.find((n) => n.id === "C-012");
    if (node)
      constraintViolations.push({
        nodeId: "C-012",
        nodeTitle: node.title,
        reason: "IP assignment lacks carve-out for pre-existing IP",
        overrideLevel: "HIGH" as RiskLevel,
      });
  }

  if (/courts? of|jurisdiction of|litigation/.test(text) && !/arbitrat/.test(text)) {
    score += 1;
    riskFactors.push({ description: "Litigation-based dispute resolution (arbitration preferred)", scoreImpact: 1 });
    const node = nodes.find((n) => n.id === "C-013");
    if (node)
      constraintViolations.push({
        nodeId: "C-013",
        nodeTitle: node.title,
        reason: "Arbitration clause absent; firm policy prefers SIAC/LCIA",
        overrideLevel: "MEDIUM" as RiskLevel,
      });
  }

  if (/\b[1-8]\d?\s*days?\b/.test(text) && /terminat/.test(text)) {
    score += 1;
    riskFactors.push({ description: "Termination notice period appears short (<90 days)", scoreImpact: 1 });
    const node = nodes.find((n) => n.id === "C-014");
    if (node)
      constraintViolations.push({
        nodeId: "C-014",
        nodeTitle: node.title,
        reason: "Notice period appears below the 90-day minimum",
        overrideLevel: "MEDIUM" as RiskLevel,
      });
  }

  if (/one.?sided|only.*shall indemnify|indemnif.*only/.test(text)) {
    score += 2;
    riskFactors.push({ description: "Potentially one-sided indemnification", scoreImpact: 2 });
    const node = nodes.find((n) => n.id === "AP-010");
    if (node)
      constraintViolations.push({
        nodeId: "AP-010",
        nodeTitle: node.title,
        reason: "Indemnification appears one-sided; mutual indemnity required",
        overrideLevel: "HIGH" as RiskLevel,
      });
  }

  if (/auto.?renew|automatic.*renew/.test(text) && /30 days|60 days/.test(text)) {
    score += 1;
    riskFactors.push({ description: "Auto-renewal with short opt-out window", scoreImpact: 1 });
    const node = nodes.find((n) => n.id === "AP-011");
    if (node)
      constraintViolations.push({
        nodeId: "AP-011",
        nodeTitle: node.title,
        reason: "Auto-renewal opt-out window is less than 90 days",
        overrideLevel: "MEDIUM" as RiskLevel,
      });
  }

  const finalScore = Math.min(score, 10);
  return {
    chunkId: chunk.id,
    score: finalScore,
    riskLevel: scoreToLevel(finalScore),
    riskFactors,
    constraintViolations,
    recommendation:
      finalScore >= 7
        ? "Immediate review required. Negotiate terms before signing."
        : finalScore >= 4
          ? "Review recommended. Discuss with client."
          : "Standard terms. No immediate action required.",
  };
}