import { DocumentChunk, ClauseType } from "./types";
import { v4 as uuidv4 } from "uuid";

// ─── Clause boundary patterns (universal across contract types) ───────────────

const CLAUSE_PATTERNS = [
  // Numbered: "1.", "2.", "10.", "1.1", "2.3.4"
  /^(\d+\.(?:\d+\.)*)\s+([A-Z][^\n]{2,60})/,
  // Article/Clause: "ARTICLE IV", "CLAUSE 3", "Section 5"
  /^(?:ARTICLE|CLAUSE|SECTION)\s+([IVXLCDM\d]+)[.:)]\s*([^\n]*)/i,
  // UPPERCASE title standalone: "CONFIDENTIALITY", "INDEMNIFICATION"
  /^([A-Z][A-Z\s]{4,40})$/,
  // Schedule/Annexure: "SCHEDULE A", "ANNEXURE 1", "EXHIBIT B"
  /^(?:SCHEDULE|ANNEXURE|EXHIBIT|APPENDIX)\s+([A-Z\d]+)/i,
  // Lettered: "(a)", "a.", "A."
  /^[(\s]*([A-Z])[.)]\s+[A-Z]/,
];

// ─── Detect if a line is a clause heading ────────────────────────────────────

function isClauseBoundary(line: string): {
  isHeading: boolean;
  clauseNumber: string;
  clauseTitle: string;
} {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) {
    return { isHeading: false, clauseNumber: "", clauseTitle: "" };
  }

  // Pattern 1: Numbered heading "1. Title" or "1.2 Title"
  const numberedMatch = trimmed.match(
    /^(\d+(?:\.\d+)*\.?)\s+([A-Z][^\n]{2,80})/
  );
  if (numberedMatch) {
    return {
      isHeading: true,
      clauseNumber: numberedMatch[1],
      clauseTitle: numberedMatch[2].trim(),
    };
  }

  // Pattern 2: "ARTICLE IV — Title" or "CLAUSE 3: Title"
  const articleMatch = trimmed.match(
    /^(?:ARTICLE|CLAUSE|SECTION)\s+([IVXLCDM\d]+)[.:\s—-]*([^\n]*)/i
  );
  if (articleMatch) {
    return {
      isHeading: true,
      clauseNumber: articleMatch[1],
      clauseTitle: articleMatch[2].trim() || `${articleMatch[0]}`,
    };
  }

  // Pattern 3: UPPERCASE standalone heading (min 5 chars, no punctuation mid-word)
  const uppercaseMatch = trimmed.match(/^([A-Z][A-Z\s\-]{4,50})$/);
  if (uppercaseMatch && !/\d/.test(trimmed)) {
    return {
      isHeading: true,
      clauseNumber: "",
      clauseTitle: uppercaseMatch[1].trim(),
    };
  }

  // Pattern 4: Schedule/Annexure/Exhibit
  const scheduleMatch = trimmed.match(
    /^(SCHEDULE|ANNEXURE|EXHIBIT|APPENDIX)\s+([A-Z\d]+)[:\s]*(.*)/i
  );
  if (scheduleMatch) {
    return {
      isHeading: true,
      clauseNumber: `${scheduleMatch[1]} ${scheduleMatch[2]}`,
      clauseTitle: scheduleMatch[3].trim() || `${scheduleMatch[1]} ${scheduleMatch[2]}`,
    };
  }

  return { isHeading: false, clauseNumber: "", clauseTitle: "" };
}

// ─── Detect clause type from title/content ───────────────────────────────────

function detectClauseType(title: string, text: string): ClauseType {
  const combined = `${title} ${text}`.toLowerCase();

  if (/\bdefin(ition|ed terms?|itions)\b/.test(combined)) return "definition";
  if (/\bindemnif(y|ication|ied)\b/.test(combined)) return "indemnity";
  if (
    /\bconfidential(ity|information)?\b/.test(combined) ||
    /\bnon-?disclosure\b/.test(combined)
  )
    return "confidentiality";
  if (
    /\bnon-?compet(e|ition)\b/.test(combined) ||
    /\bnon-?solicit(ation)?\b/.test(combined)
  )
    return "non_compete";
  if (
    /\b(intellectual property|ip ownership|ip rights|copyright|patent)\b/.test(
      combined
    )
  )
    return "ip";
  if (
    /\b(terminat(e|ion)|expir(y|ation)|cancell?ation)\b/.test(combined)
  )
    return "termination";
  if (
    /\b(liabilit(y|ies)|limitation of|cap on damages|indemnit(y|ies))\b/.test(
      combined
    )
  )
    return "limitation";
  if (
    /\b(arbitrat(e|ion)|dispute(s| resolution)|governing law|jurisdiction)\b/.test(
      combined
    )
  )
    return "dispute";
  if (/\b(payment(s)?|fees|invoice|compensation|salary)\b/.test(combined))
    return "payment";
  if (
    /\b(shall|must|will|agrees to|undertakes|obligat(ion|ed))\b/.test(combined)
  )
    return "obligation";

  return "general";
}

// ─── Main chunker ─────────────────────────────────────────────────────────────

export function chunkDocument(
  documentId: string,
  text: string
): DocumentChunk[] {
  const lines = text.split("\n");
  const chunks: DocumentChunk[] = [];

  let currentClauseNumber = "";
  let currentClauseTitle = "";
  let currentLines: string[] = [];
  let chunkIndex = 0;

  function flushChunk() {
    const body = currentLines.join("\n").trim();
    if (!body || body.length < 20) return; // skip tiny fragments

    const clauseType = detectClauseType(currentClauseTitle, body);

    chunks.push({
      id: uuidv4(),
      documentId,
      chunkIndex: chunkIndex++,
      clauseNumber: currentClauseNumber || String(chunkIndex),
      clauseTitle: currentClauseTitle || "General Provisions",
      clauseType,
      text: body,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const { isHeading, clauseNumber, clauseTitle } = isClauseBoundary(line);

    if (isHeading) {
      // Flush the previous chunk before starting new one
      flushChunk();
      currentClauseNumber = clauseNumber;
      currentClauseTitle = clauseTitle;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  // Flush the last chunk
  flushChunk();

  // If NO headings detected (flat document), do paragraph-based chunking
  if (chunks.length <= 1) {
    return fallbackParagraphChunk(documentId, text);
  }

  return chunks;
}

// ─── Fallback: paragraph chunking for unstructured documents ─────────────────

function fallbackParagraphChunk(
  documentId: string,
  text: string
): DocumentChunk[] {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 50);
  return paragraphs.map((para, i) => ({
    id: uuidv4(),
    documentId,
    chunkIndex: i,
    clauseNumber: String(i + 1),
    clauseTitle: `Paragraph ${i + 1}`,
    clauseType: detectClauseType("", para),
    text: para.trim(),
  }));
}
