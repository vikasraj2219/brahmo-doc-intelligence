import { NextResponse } from "next/server";
import { getKnowledgeNodes } from "@/lib/store";

export async function GET() {
  const nodes = await getKnowledgeNodes();
  return NextResponse.json({ nodes });
}
