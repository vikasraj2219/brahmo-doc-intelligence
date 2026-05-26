"use client";

import { ComparisonResult, DiffPart, MatchType } from "@/lib/types";
import { useState } from "react";

interface Props {
  results: ComparisonResult[];
}

const MATCH_STYLES: Record<MatchType, { label: string; badge: string; border: string; bg: string }> = {
  MODIFIED: { label: "MODIFIED", badge: "bg-amber-500/20 text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/5" },
  ADDED:    { label: "ADDED",    badge: "bg-green-500/20 text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/5"  },
  REMOVED:  { label: "REMOVED",  badge: "bg-red-500/20 text-red-400",      border: "border-red-500/40",    bg: "bg-red-500/5"    },
  UNCHANGED:{ label: "UNCHANGED",badge: "bg-white/10 text-white/30",       border: "border-white/10",      bg: ""                },
};

function DiffDisplay({ parts }: { parts: DiffPart[] }) {
  return (
    <span className="font-sans text-xs leading-relaxed">
      {parts.map((p, i) => {
        if (p.type === "added")
          return <mark key={i} className="bg-green-500/30 text-green-300 rounded-sm px-0.5 not-italic">{p.text}</mark>;
        if (p.type === "removed")
          return <del key={i} className="text-red-400/70 bg-red-500/20 rounded-sm px-0.5">{p.text}</del>;
        return <span key={i} className="text-white/60">{p.text}</span>;
      })}
    </span>
  );
}

function RiskBadge({ score, level }: { score?: number; level?: string }) {
  if (!score || !level) return null;
  const color =
    level === "HIGH"   ? "bg-red-500/20 text-red-400" :
    level === "MEDIUM" ? "bg-amber-500/20 text-amber-400" :
                         "bg-green-500/20 text-green-400";
  return <span className={`text-xs px-2 py-0.5 rounded font-bold ${color}`}>{score}/10 {level}</span>;
}

function RiskDeltaBadge({ delta, amount }: { delta?: string; amount?: number }) {
  if (!delta || delta === "UNCHANGED") return null;
  if (delta === "INCREASED")
    return <span className="text-red-400 text-xs font-bold">Risk ↑ {amount && amount > 0 ? `+${amount.toFixed(1)}` : ""}</span>;
  return <span className="text-green-400 text-xs font-bold">Risk ↓ {amount ? Math.abs(amount).toFixed(1) : ""}</span>;
}

export default function ComparisonView({ results }: Props) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(
    // Auto-expand first changed clause
    results.find(r => r.matchType !== "UNCHANGED")?.chunkV1?.id ||
    results.find(r => r.matchType !== "UNCHANGED")?.chunkV2?.id ||
    null
  );

  if (!results || results.length === 0) {
    return (
      <div className="border border-white/10 p-8 text-center text-white/40 text-sm">
        No comparison results. Make sure both documents were uploaded and chunked correctly.
      </div>
    );
  }

  const changed = results.filter(r => r.matchType !== "UNCHANGED");
  const unchanged = results.filter(r => r.matchType === "UNCHANGED");
  const filtered = showUnchanged ? results : changed;

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-xs text-white/50">
          <span><span className="text-amber-400 font-bold">{results.filter(r=>r.matchType==="MODIFIED").length}</span> modified</span>
          <span><span className="text-green-400 font-bold">{results.filter(r=>r.matchType==="ADDED").length}</span> added</span>
          <span><span className="text-red-400 font-bold">{results.filter(r=>r.matchType==="REMOVED").length}</span> removed</span>
          <span><span className="text-white/30 font-bold">{unchanged.length}</span> unchanged</span>
        </div>
        <button
          onClick={() => setShowUnchanged(!showUnchanged)}
          className="text-xs border border-white/20 px-3 py-1 hover:border-white/40 transition-all text-white/50"
        >
          {showUnchanged ? "HIDE UNCHANGED" : "SHOW ALL CLAUSES"}
        </button>
      </div>

      {/* Empty changed state */}
      {changed.length === 0 && !showUnchanged && (
        <div className="border border-white/10 p-8 text-center space-y-2">
          <div className="text-white/50 text-sm">No changes detected between the two versions.</div>
          <button onClick={() => setShowUnchanged(true)} className="text-amber-400 text-xs underline">
            Show all {unchanged.length} unchanged clauses
          </button>
        </div>
      )}

      {/* Results list */}
      <div className="space-y-2">
        {filtered.map((r) => {
          const id = r.chunkV1?.id || r.chunkV2?.id || "";
          const styles = MATCH_STYLES[r.matchType];
          const isOpen = expanded === id;
          const title = r.chunkV2?.clauseTitle || r.chunkV1?.clauseTitle || "Unknown";
          const number = r.chunkV2?.clauseNumber || r.chunkV1?.clauseNumber;

          return (
            <div key={id} className={`border ${styles.border} ${styles.bg}`}>
              {/* Row header */}
              <button
                onClick={() => setExpanded(isOpen ? null : id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {number && <span className="text-white/40 text-xs font-mono">§{number}</span>}
                    <span className="text-white text-sm font-bold truncate max-w-md">{title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${styles.badge}`}>{styles.label}</span>
                    {r.splitDetected && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">SEMANTIC MATCH</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <RiskDeltaBadge delta={r.riskDelta} amount={r.riskDeltaAmount} />
                    <span className="text-white/30 text-xs">{r.chunkV1?.clauseType || r.chunkV2?.clauseType}</span>
                    {r.matchType !== "UNCHANGED" && (
                      <span className="text-white/20 text-xs">sim: {(r.similarityScore * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.riskV1 && <RiskBadge score={r.riskV1.score} level={r.riskV1.riskLevel} />}
                  {r.riskV2 && r.matchType !== "REMOVED" && <RiskBadge score={r.riskV2.score} level={r.riskV2.riskLevel} />}
                  <span className="text-white/30 text-xs ml-2">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-white/5">

                  {/* MODIFIED — side by side with diff */}
                  {r.matchType === "MODIFIED" && (
                    <div className="grid grid-cols-2 divide-x divide-white/10">
                      <div className="p-4 space-y-3">
                        <div className="text-white/30 text-xs tracking-widest">VERSION 1</div>
                        <div className="text-xs leading-relaxed font-sans text-white/60 whitespace-pre-wrap">
                          {r.chunkV1?.text?.slice(0, 600)}{(r.chunkV1?.text?.length || 0) > 600 ? "..." : ""}
                        </div>
                        {r.riskV1 && (
                          <div className="space-y-1">
                            <RiskBadge score={r.riskV1.score} level={r.riskV1.riskLevel} />
                            {r.riskV1.riskFactors?.map((f, i) => (
                              <div key={i} className="text-xs text-white/40">• {f.description}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="text-white/30 text-xs tracking-widest">VERSION 2 — CHANGES HIGHLIGHTED</div>
                        <div className="leading-relaxed whitespace-pre-wrap">
                          {r.diffParts ? <DiffDisplay parts={r.diffParts} /> : (
                            <span className="text-xs text-white/60">{r.chunkV2?.text?.slice(0, 600)}</span>
                          )}
                        </div>
                        {r.riskV2 && (
                          <div className="space-y-1">
                            <RiskBadge score={r.riskV2.score} level={r.riskV2.riskLevel} />
                            {r.riskV2.constraintViolations?.map((v, i) => (
                              <div key={i} className="border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-xs">
                                <span className="text-amber-400 font-bold">⚠ [{v.nodeId}] </span>
                                <span className="text-white/50">{v.reason}</span>
                              </div>
                            ))}
                            {r.riskV2.riskFactors?.map((f, i) => (
                              <div key={i} className="text-xs text-white/40">• {f.description}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ADDED */}
                  {r.matchType === "ADDED" && (
                    <div className="p-4 space-y-3">
                      <div className="text-green-400 text-xs tracking-widest">NEW CLAUSE ADDED IN V2</div>
                      <div className="text-xs leading-relaxed font-sans text-white/60 whitespace-pre-wrap">
                        {r.chunkV2?.text?.slice(0, 600)}{(r.chunkV2?.text?.length || 0) > 600 ? "..." : ""}
                      </div>
                      {r.riskV2 && (
                        <div className="space-y-1">
                          <RiskBadge score={r.riskV2.score} level={r.riskV2.riskLevel} />
                          <div className="text-xs text-white/50 font-sans">{r.riskV2.recommendation}</div>
                          {r.riskV2.constraintViolations?.map((v, i) => (
                            <div key={i} className="border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-xs">
                              <span className="text-amber-400 font-bold">⚠ [{v.nodeId}] </span>
                              <span className="text-white/50">{v.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* REMOVED */}
                  {r.matchType === "REMOVED" && (
                    <div className="p-4 space-y-3">
                      <div className="text-red-400 text-xs tracking-widest">CLAUSE REMOVED IN V2</div>
                      <div className="text-xs leading-relaxed font-sans text-white/50 line-through whitespace-pre-wrap">
                        {r.chunkV1?.text?.slice(0, 600)}{(r.chunkV1?.text?.length || 0) > 600 ? "..." : ""}
                      </div>
                      {r.riskV1 && (
                        <div className="space-y-1">
                          <RiskBadge score={r.riskV1.score} level={r.riskV1.riskLevel} />
                          <div className="text-xs text-white/50 font-sans">{r.riskV1.recommendation}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* UNCHANGED */}
                  {r.matchType === "UNCHANGED" && (
                    <div className="p-4">
                      <div className="text-white/20 text-xs tracking-widest mb-2">NO CHANGES</div>
                      <div className="text-xs leading-relaxed font-sans text-white/30 whitespace-pre-wrap">
                        {r.chunkV1?.text?.slice(0, 300)}{(r.chunkV1?.text?.length || 0) > 300 ? "..." : ""}
                      </div>
                      {r.riskV1 && (
                        <div className="mt-2">
                          <RiskBadge score={r.riskV1.score} level={r.riskV1.riskLevel} />
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}