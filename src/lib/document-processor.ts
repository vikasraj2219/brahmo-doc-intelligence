// Document processor: extract text from DOCX and PDF files
// Uses mammoth for DOCX, pdf-parse for PDF

export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "docx" || ext === "doc") {
    return extractDocx(buffer);
  } else if (ext === "pdf") {
    return extractPdf(buffer);
  } else if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid issues if mammoth not installed
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return cleanExtractedText(result.value);
  } catch (err) {
    throw new Error(`DOCX extraction failed: ${err}`);
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const result = await pdfParse.default(buffer);
    return cleanExtractedText(result.text);
  } catch (err) {
    throw new Error(`PDF extraction failed: ${err}`);
  }
}

// Clean extracted text: normalize whitespace, remove page numbers, headers/footers
function cleanExtractedText(text: string): string {
  return text
    // Remove page numbers (standalone numbers on a line)
    .replace(/^\s*\d+\s*$/gm, "")
    // Normalize multiple blank lines to at most 2
    .replace(/\n{3,}/g, "\n\n")
    // Remove form feeds
    .replace(/\f/g, "\n\n")
    // Trim trailing whitespace per line
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}
