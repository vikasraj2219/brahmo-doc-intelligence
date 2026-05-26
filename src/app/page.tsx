"use client";

import { useState, useRef } from "react";
import DocumentUpload from "@/components/DocumentUpload";
import RiskHeatmap from "@/components/RiskHeatmap";
import ComparisonView from "@/components/ComparisonView";
import KnowledgePanel from "@/components/KnowledgePanel";
import { DocumentChunk, RiskScore, ComparisonResult } from "@/lib/types";

type Mode = "idle" | "single" | "compare";
type Step = "upload" | "scoring" | "results" | "uploading-v2" | "comparison-results";

export default function Home() {
  const [mode, setMode]                   = useState<Mode>("idle");
  const [step, setStep]                   = useState<Step>("upload");
  const [v1Name, setV1Name]               = useState("");
  const [v2Name, setV2Name]               = useState("");
  const [riskScores, setRiskScores]       = useState<RiskScore[]>([]);
  const [riskSummary, setRiskSummary]     = useState<{ high: number; medium: number; low: number } | null>(null);
  const [compResults, setCompResults]     = useState<ComparisonResult[]>([]);
  const [netDelta, setNetDelta]           = useState<"INCREASED" | "DECREASED" | "UNCHANGED" | null>(null);
  const [compSummary, setCompSummary]     = useState<{ changed: number; added: number; removed: number } | null>(null);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [statusMsg, setStatusMsg]         = useState("");

  // Use a ref to store v1 chunks — avoids stale closure issues with useCallback
  const v1ChunksRef = useRef<DocumentChunk[]>([]);

  // ── Upload v1 ──────────────────────────────────────────────────────────────
  const handleUploadV1 = async (file: File) => {
    setError(null);
    setStep("scoring");
    setStatusMsg("Extracting clauses...");

    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || "Upload failed");
      const { document, chunks } = await uploadRes.json();

      setV1Name(document.filename);
      v1ChunksRef.current = chunks;

      setStatusMsg(`Scoring ${chunks.length} clauses...`);
      const scoreRes = await fetch("/api/score-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunks }),
      });
      if (!scoreRes.ok) throw new Error((await scoreRes.json()).error || "Scoring failed");
      const scoreData = await scoreRes.json();

      setRiskScores(scoreData.scores || []);
      setRiskSummary(scoreData.summary);
      setMode("single");
      setStep("results");
      setStatusMsg("");
    } catch (err: any) {
      setError(err.message);
      setStep("upload");
      setStatusMsg("");
    }
  };

  // ── Upload v2 and compare ──────────────────────────────────────────────────
  const handleUploadV2 = async (file: File) => {
    setError(null);
    setStep("uploading-v2");
    setStatusMsg("Uploading v2...");

    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || "Upload failed");
      const { document, chunks: v2Chunks } = await uploadRes.json();
      setV2Name(document.filename);

      setStatusMsg(`Comparing clauses and scoring changes...`);
      const compareRes = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ v1Chunks: v1ChunksRef.current, v2Chunks }),
      });
      if (!compareRes.ok) throw new Error((await compareRes.json()).error || "Compare failed");
      const compareData = await compareRes.json();

      setCompResults(compareData.results || []);
      setNetDelta(compareData.netDelta);
      setCompSummary({
        changed: compareData.changedCount,
        added:   compareData.addedCount,
        removed: compareData.removedCount,
      });
      setMode("compare");
      setStep("comparison-results");
      setStatusMsg("");
    } catch (err: any) {
      setError(err.message);
      setStep("results"); // go back to single doc results
      setStatusMsg("");
    }
  };

  const reset = () => {
    setMode("idle"); setStep("upload");
    setV1Name(""); setV2Name("");
    setRiskScores([]); setRiskSummary(null);
    setCompResults([]); setNetDelta(null); setCompSummary(null);
    setShowKnowledge(false); setError(null); setStatusMsg("");
    v1ChunksRef.current = [];
  };

  const isLoading = step === "scoring" || step === "uploading-v2";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-amber-400 rounded flex items-center justify-center">
            <span className="text-black font-bold text-sm">B</span>
          </div>
          <div>
            <div className="text-amber-400 font-bold tracking-widest text-sm">BRAHMO</div>
            <div className="text-white/40 text-xs tracking-wider">DOCUMENT INTELLIGENCE</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(mode === "single" || mode === "compare") && (
            <button onClick={() => setShowKnowledge(!showKnowledge)}
              className="text-xs border border-white/20 px-3 py-1.5 hover:border-amber-400/50 hover:text-amber-400 transition-all">
              {showKnowledge ? "HIDE" : "SHOW"} FIRM KNOWLEDGE
            </button>
          )}
          {mode !== "idle" && (
            <button onClick={reset}
              className="text-xs border border-white/20 px-3 py-1.5 hover:border-red-400/50 hover:text-red-400 transition-all">
              ← NEW ANALYSIS
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)]">
        <main className="flex-1 p-8 overflow-y-auto">

          {/* ── IDLE: upload ─────────────────────────────────────────── */}
          {mode === "idle" && !isLoading && (
            <div className="max-w-2xl mx-auto mt-16">
              <div className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-3">Contract Intelligence</h1>
                <p className="text-white/50 text-sm leading-relaxed">
                  Upload a contract for instant risk assessment, or upload two versions
                  for clause-by-clause comparison. Powered by firm-specific knowledge rules.
                </p>
              </div>
              <DocumentUpload onUpload={handleUploadV1} label="Upload Contract (DOCX / PDF / TXT)" />
              {error && (
                <div className="mt-4 border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm">⚠ {error}</div>
              )}
            </div>
          )}

          {/* ── LOADING spinner ───────────────────────────────────────── */}
          {isLoading && (
            <div className="max-w-2xl mx-auto mt-24 text-center">
              <div className="inline-block w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-6" />
              <p className="text-white/60 text-sm tracking-wider">{statusMsg || "PROCESSING..."}</p>
              <p className="text-white/30 text-xs mt-2">This may take 15–30 seconds for free-tier AI providers</p>
            </div>
          )}

          {/* ── SINGLE DOC: risk heatmap ──────────────────────────────── */}
          {mode === "single" && step === "results" && (
            <div>
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="text-white/40 text-xs tracking-widest mb-1">RISK ASSESSMENT</div>
                  <h2 className="text-xl font-bold truncate max-w-lg">{v1Name}</h2>
                  {riskSummary && (
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-red-400 font-bold">{riskSummary.high} HIGH</span>
                      <span className="text-amber-400 font-bold">{riskSummary.medium} MEDIUM</span>
                      <span className="text-green-400 font-bold">{riskSummary.low} LOW</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-white/40 text-xs mb-2">COMPARE WITH REVISED VERSION</div>
                  <DocumentUpload onUpload={handleUploadV2} label="+ Upload v2" compact />
                </div>
              </div>
              {error && (
                <div className="mb-4 border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm">⚠ {error}</div>
              )}
              <RiskHeatmap chunks={v1ChunksRef.current} scores={riskScores} />
            </div>
          )}

          {/* ── COMPARISON results ────────────────────────────────────── */}
          {mode === "compare" && step === "comparison-results" && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-white/40 text-xs tracking-widest mb-1">COMPARISON RESULTS</div>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="text-white/60 truncate max-w-xs">{v1Name}</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white/60 truncate max-w-xs">{v2Name}</span>
                  </div>
                  {compSummary && (
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-amber-400 font-bold">{compSummary.changed} MODIFIED</span>
                      <span className="text-green-400 font-bold">{compSummary.added} ADDED</span>
                      <span className="text-red-400 font-bold">{compSummary.removed} REMOVED</span>
                    </div>
                  )}
                </div>
                {netDelta && (
                  <div className={`border px-4 py-2 text-sm font-bold tracking-widest ${
                    netDelta === "INCREASED" ? "border-red-500/50 bg-red-500/10 text-red-400" :
                    netDelta === "DECREASED" ? "border-green-500/50 bg-green-500/10 text-green-400" :
                    "border-white/20 text-white/50"
                  }`}>
                    NET RISK {netDelta} {netDelta === "INCREASED" ? "↑" : netDelta === "DECREASED" ? "↓" : "→"}
                  </div>
                )}
              </div>
              {error && (
                <div className="mb-4 border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm">⚠ {error}</div>
              )}
              <ComparisonView results={compResults} />
            </div>
          )}

        </main>

        {/* Knowledge sidebar */}
        {showKnowledge && (
          <aside className="w-80 border-l border-white/10 p-6 overflow-y-auto">
            <KnowledgePanel activeViolations={
              riskScores.flatMap(s => s.constraintViolations || []).concat(
                compResults.flatMap(r => [
                  ...(r.riskV1?.constraintViolations || []),
                  ...(r.riskV2?.constraintViolations || []),
                ])
              )
            } />
          </aside>
        )}
      </div>
    </div>
  );
}