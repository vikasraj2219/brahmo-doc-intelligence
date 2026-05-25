"use client";

import { useState, useCallback } from "react";
import DocumentUpload from "@/components/DocumentUpload";
import RiskHeatmap from "@/components/RiskHeatmap";
import ComparisonView from "@/components/ComparisonView";
import KnowledgePanel from "@/components/KnowledgePanel";
import { DocumentChunk, RiskScore, ComparisonResult } from "@/lib/types";

type Mode = "idle" | "single" | "compare";
type Step = "upload" | "scoring" | "results" | "uploading-v2" | "comparing" | "comparison-results";

export default function Home() {
  const [mode, setMode] = useState<Mode>("idle");
  const [step, setStep] = useState<Step>("upload");
  const [v1Doc, setV1Doc] = useState<{ name: string; chunks: DocumentChunk[] } | null>(null);
  const [v2Doc, setV2Doc] = useState<{ name: string; chunks: DocumentChunk[] } | null>(null);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [riskSummary, setRiskSummary] = useState<{ high: number; medium: number; low: number } | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [netDelta, setNetDelta] = useState<"INCREASED" | "DECREASED" | "UNCHANGED" | null>(null);
  const [compareSummary, setCompareSummary] = useState<{ changed: number; added: number; removed: number } | null>(null);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Upload a document ──────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File, isV2 = false) => {
    setError(null);
    setStep(isV2 ? "uploading-v2" : "scoring");

    const form = new FormData();
    form.append("file", file);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      setError(err.error || "Upload failed");
      setStep(isV2 ? "uploading-v2" : "upload");
      return;
    }

    const { document, chunks } = await uploadRes.json();

    if (!isV2) {
      setV1Doc({ name: document.filename, chunks });

      // Score risk
      const scoreRes = await fetch("/api/score-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunks }),
      });
      const scoreData = await scoreRes.json();
      setRiskScores(scoreData.scores);
      setRiskSummary(scoreData.summary);
      setMode("single");
      setStep("results");
    } else {
      setV2Doc({ name: document.filename, chunks });

      // Compare
      const compareRes = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ v1Chunks: v1Doc!.chunks, v2Chunks: chunks }),
      });
      const compareData = await compareRes.json();
      setComparisonResults(compareData.results);
      setNetDelta(compareData.netDelta);
      setCompareSummary({
        changed: compareData.changedCount,
        added: compareData.addedCount,
        removed: compareData.removedCount,
      });
      setMode("compare");
      setStep("comparison-results");
    }
  }, [v1Doc]);

  const reset = () => {
    setMode("idle");
    setStep("upload");
    setV1Doc(null);
    setV2Doc(null);
    setRiskScores([]);
    setRiskSummary(null);
    setComparisonResults([]);
    setNetDelta(null);
    setCompareSummary(null);
    setError(null);
    setShowKnowledge(false);
  };

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
            <button
              onClick={() => setShowKnowledge(!showKnowledge)}
              className="text-xs border border-white/20 px-3 py-1.5 hover:border-amber-400/50 hover:text-amber-400 transition-all"
            >
              {showKnowledge ? "HIDE" : "SHOW"} FIRM KNOWLEDGE
            </button>
          )}
          {mode !== "idle" && (
            <button
              onClick={reset}
              className="text-xs border border-white/20 px-3 py-1.5 hover:border-red-400/50 hover:text-red-400 transition-all"
            >
              ← NEW ANALYSIS
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)]">
        {/* Main content */}
        <main className="flex-1 p-8">

          {/* ── Idle / Upload state ─────────────────────────────────── */}
          {mode === "idle" && step === "upload" && (
            <div className="max-w-2xl mx-auto mt-16">
              <div className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-3">
                  Contract Intelligence
                </h1>
                <p className="text-white/50 text-sm leading-relaxed">
                  Upload a contract for instant risk assessment, or upload two versions
                  for clause-by-clause comparison. Powered by firm-specific knowledge rules.
                </p>
              </div>
              <DocumentUpload onUpload={(f) => handleUpload(f, false)} label="Upload Contract (DOCX / PDF)" />
              {error && (
                <div className="mt-4 border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                  ⚠ {error}
                </div>
              )}
            </div>
          )}

          {/* ── Loading state ───────────────────────────────────────── */}
          {(step === "scoring" || step === "uploading-v2" || step === "comparing") && (
            <div className="max-w-2xl mx-auto mt-24 text-center">
              <div className="inline-block w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-6" />
              <p className="text-white/60 text-sm tracking-wider">
                {step === "scoring" && "EXTRACTING CLAUSES + SCORING RISK..."}
                {step === "uploading-v2" && "PROCESSING REVISED CONTRACT..."}
                {step === "comparing" && "COMPARING CLAUSES..."}
              </p>
            </div>
          )}

          {/* ── Single doc results ──────────────────────────────────── */}
          {mode === "single" && step === "results" && v1Doc && (
            <div>
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="text-white/40 text-xs tracking-widest mb-1">RISK ASSESSMENT</div>
                  <h2 className="text-xl font-bold truncate max-w-lg">{v1Doc.name}</h2>
                  {riskSummary && (
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-red-400">{riskSummary.high} HIGH</span>
                      <span className="text-amber-400">{riskSummary.medium} MEDIUM</span>
                      <span className="text-green-400">{riskSummary.low} LOW</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-white/40 text-xs mb-2 text-right">COMPARE WITH REVISED VERSION</div>
                  <DocumentUpload
                    onUpload={(f) => handleUpload(f, true)}
                    label="Upload v2"
                    compact
                  />
                </div>
              </div>
              <RiskHeatmap chunks={v1Doc.chunks} scores={riskScores} />
            </div>
          )}

          {/* ── Comparison results ──────────────────────────────────── */}
          {mode === "compare" && step === "comparison-results" && v1Doc && v2Doc && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-white/40 text-xs tracking-widest mb-1">COMPARISON RESULTS</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-white/60 truncate max-w-xs">{v1Doc.name}</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white/60 truncate max-w-xs">{v2Doc.name}</span>
                  </div>
                  {compareSummary && (
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-amber-400">{compareSummary.changed} MODIFIED</span>
                      <span className="text-green-400">{compareSummary.added} ADDED</span>
                      <span className="text-red-400">{compareSummary.removed} REMOVED</span>
                    </div>
                  )}
                </div>
                {netDelta && (
                  <div className={`border px-4 py-2 text-sm font-bold tracking-widest ${
                    netDelta === "INCREASED"
                      ? "border-red-500/50 bg-red-500/10 text-red-400"
                      : netDelta === "DECREASED"
                      ? "border-green-500/50 bg-green-500/10 text-green-400"
                      : "border-white/20 text-white/50"
                  }`}>
                    NET RISK {netDelta} {netDelta === "INCREASED" ? "↑" : netDelta === "DECREASED" ? "↓" : "→"}
                  </div>
                )}
              </div>
              <ComparisonView results={comparisonResults} />
            </div>
          )}
        </main>

        {/* Knowledge panel */}
        {showKnowledge && (
          <aside className="w-80 border-l border-white/10 p-6 overflow-y-auto">
            <KnowledgePanel activeViolations={
              riskScores.flatMap(s => s.constraintViolations || [])
                .concat(comparisonResults.flatMap(r => [...(r.riskV1?.constraintViolations || []), ...(r.riskV2?.constraintViolations || [])]))
            } />
          </aside>
        )}
      </div>
    </div>
  );
}
