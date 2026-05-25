"use client";

import { ComparisonResult, DiffPart, MatchType } from "@/lib/types";
import { useState } from "react";

interface Props {
  results: ComparisonResult[];
}

const MATCH_STYLES: Record<MatchType, { label: string; badge: string; border: string }> = {
  MODIFIED: { label: "MODIFIED", badge: "bg-amber-500/20 text-amber-400", border: "border-amber-500/30" },
  ADDED: { label: "ADDED", badge: "bg-green-500/20 text-green-400", border: "border-green-500/30" },
  REMOVED: { label: "REMOVED", badge: "bg-red-500/20 text-red-400", border: "border-red-500/30" },
  UNCHANGED: { label: "UNCHANGED", badge: "bg-white/10 text-white/30", border: "border-white/10" },
};

function DiffDisplay({ parts }: { parts: DiffPart[] }) {
  return (
    <span className="font-sans text-xs leading-relaxed">
      {parts.map((p, i) => {
        if (p.type === "added")
          return <mark key={i} className="bg-green-500/30 text-green-300 rounded-sm px-0.5">{p.text}</mark>;
        if (p.type === "removed")
          return <del key={i} className="text-red-400/70 bg-red-500/20 rounded-sm px-0.5">{p.text}</del>;
        return <span key={i} className="text-white/60">{p.text}</span>;
      })}
    </span>
  );
}

function RiskDeltaBadge({ delta, amount }: { delta?: string; amount?: number }) {
  if (!delta) return null;
  if (delta === "INCREASED")
    return <span className="text-red-400 text-xs">Risk ↑ {amount && amount > 0 ? `+${amount.toFixed(1)}` : ""}</span>;
  if (delta === "DECREASED")
    return <span className="text-green-400 text-xs">Risk ↓ {amount ? Math.abs(amount).toFixed(1) : ""}</span>;
  return <span className="text-white/30 text-xs">Risk →</span>;
}

export default function ComparisonView({ results }: Props) {
  const [expanded, setExpanded] = useState<string | null>(results[0]?.chunkV1?.id || results[0]?.chunkV2?.id || null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const filtered = showUnchanged ? results : results.filter(r => r.matchType !== "UNCHANGED");

  return (
    <div>
      {/* Filter toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-white/30 text-xs">
          Showing {filtered.length} of {results.length} clauses
        </div>
        <button
          onClick={() => setShowUnchanged(!showUnchanged)}
          className="text-xs border border-white/20 px-3 py-1 hover:border-white/40 transition-all text-white/50"
        >
          {showUnchanged ? "HIDE UNCHANGED" : "SHOW ALL CLAUSES"}
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((r) => {
          const id = r.chunkV1?.id || r.chunkV2?.id || "";
          const styles = MATCH_STYLES[r.matchType];
          const isOpen = expanded === id;
          const title = r.chunkV2?.clauseTitle || r.chunkV1?.clauseTitle;
          const number = r.chunkV2?.clauseNumber || r.chunkV1?.clauseNumber;

          return (
            <div key={id} className={`border ${styles.border}`}>
              <button
                onClick={() => setExpanded(isOpen ? null : id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {number && <span className="text-white/40 text-xs">§{number}</span>}
                    <span className="text-white text-sm font-bold">{title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${styles.badge}`}>
                      {styles.label}
                    </span>
                    {r.splitDetected && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                        SEMANTIC MATCH
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <RiskDeltaBadge delta={r.riskDelta} amount={r.riskDeltaAmount} />
                    {r.chunkV1?.clauseType && (
                      <span className="text-white/30 text-xs">{r.chunkV1.clauseType}</span>
                    )}
                  </div>
                </div>
                <span className="text-white/30 text-xs">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className={`border-t border-white/5 ${r.matchType === "UNCHANGED" ? "p-4" : ""}`}>
                  {r.matchType === "MODIFIED" && r.diffParts && (
                    <div className="grid grid-cols-2 divide-x divide-white/10">
                      {/* V1 */}
                      <div className="p-4">
                        <div className="text-white/30 text-xs mb-2 tracking-widest">VERSION 1</div>
                        <div className="text-xs leading-relaxed font-sans text-white/60">
                          {r.chunkV1?.text.slice(0, 500)}
                        </div>
                        {r.riskV1 && (
                          <div className="mt-3 text-xs">
                            <span className={`px-2 py-0.5 rounded ${
                              r.riskV1.riskLevel === "HIGH" ? "bg-red-500/20 text-red-400" :
                              r.riskV1.riskLevel === "MEDIUM" ? "bg-amber-500/20 text-amber-400" :
                              "bg-green-500/20 text-green-400"
                            }`}>
                              Risk: {r.riskV1.score}/10 {r.riskV1.riskLevel}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* V2 with diff */}
                      <div className="p-4">
                        <div className="text-white/30 text-xs mb-2 tracking-widest">VERSION 2 (CHANGES)</div>
                        <DiffDisplay parts={r.diffParts} />
                        {r.riskV2 && (
                          <div className="mt-3 text-xs space-y-1">
                            <span className={`px-2 py-0.5 rounded ${
                              r.riskV2.riskLevel === "HIGH" ? "bg-red-500/20 text-red-400" :
                              r.riskV2.riskLevel === "MEDIUM" ? "bg-amber-500/20 text-amber-400" :
                              "bg-green-500/20 text-green-400"
                            }`}>
                              Risk: {r.riskV2.score}/10 {r.riskV2.riskLevel}
                            </span>
                            {r.riskV2.constraintViolations.map((v, i) => (
                              <div key={i} className="border border-amber-500/20 bg-amber-500/5 px-2 py-1 mt-2">
                                <span className="text-amber-400">⚠ [{v.nodeId}] </span>
                                <span className="text-white/50">{v.reason}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {r.matchType === "ADDED" && (
                    <div className="p-4">
                      <div className="text-green-400 text-xs mb-2 tracking-widest">NEW CLAUSE ADDED</div>
                      <div className="text-xs leading-relaxed font-sans text-white/60">
                        {r.chunkV2?.text.slice(0, 500)}
                      </div>
                      {r.riskV2 && (
                        <div className="mt-3 text-xs space-y-1">
                          <span className={`px-2 py-0.5 rounded ${
                            r.riskV2.riskLevel === "HIGH" ? "bg-red-500/20 text-red-400" :
                            r.riskV2.riskLevel === "MEDIUM" ? "bg-amber-500/20 text-amber-400" :
                            "bg-green-500/20 text-green-400"
                          }`}>
                            Risk: {r.riskV2.score}/10 {r.riskV2.riskLevel}
                          </span>
                          {r.riskV2.constraintViolations.map((v, i) => (
                            <div key={i} className="border border-amber-500/20 bg-amber-500/5 px-2 py-1 mt-2">
                              <span className="text-amber-400">⚠ [{v.nodeId}] </span>
                              <span className="text-white/50">{v.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {r.matchType === "REMOVED" && (
                    <div className="p-4">
                      <div className="text-red-400 text-xs mb-2 tracking-widest">CLAUSE REMOVED</div>
                      <div className="text-xs leading-relaxed font-sans text-white/50 line-through">
                        {r.chunkV1?.text.slice(0, 500)}
                      </div>
                    </div>
                  )}

                  {r.matchType === "UNCHANGED" && (
                    <div className="text-xs leading-relaxed font-sans text-white/30">
                      {r.chunkV1?.text.slice(0, 300)}...
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
