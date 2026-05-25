import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { extractText } from "@/lib/document-processor";
import { chunkDocument } from "@/lib/legal-chunker";
import { saveDocument, saveChunks } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, file.name);
    const docId = uuidv4();

    const document = {
      id: docId,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      contentText: text,
    };

    await saveDocument(document);

    const chunks = chunkDocument(docId, text);
    await saveChunks(chunks);

    return NextResponse.json({ document, chunks });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
