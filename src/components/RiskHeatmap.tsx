"use client";

import { DocumentChunk, RiskScore } from "@/lib/types";
import { useState } from "react";

interface Props {
  chunks: DocumentChunk[];
  scores: RiskScore[];
}

const LEVEL_STYLES = {
  HIGH: { dot: "bg-red-500", border: "border-red-500/30", bg: "bg-red-500/5", badge: "bg-red-500/20 text-red-400", icon: "🔴" },
  MEDIUM: { dot: "bg-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/5", badge: "bg-amber-500/20 text-amber-400", icon: "🟡" },
  LOW: { dot: "bg-green-500", border: "border-green-500/30", bg: "bg-green-500/5", badge: "bg-green-500/20 text-green-400", icon: "🟢" },
};

export default function RiskHeatmap({ chunks, scores }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const scoreMap = Object.fromEntries(scores.map((s) => [s.chunkId, s]));

  // Sort: HIGH first, then MEDIUM, then LOW
  const sorted = [...chunks].sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const sa = scoreMap[a.id]?.riskLevel || "LOW";
    const sb = scoreMap[b.id]?.riskLevel || "LOW";
    return order[sa] - order[sb];
  });

  return (
    <div className="space-y-2">
      {sorted.map((chunk) => {
        const score = scoreMap[chunk.id];
        const level = score?.riskLevel || "LOW";
        const styles = LEVEL_STYLES[level];
        const isOpen = expanded === chunk.id;

        return (
          <div
            key={chunk.id}
            className={`border ${styles.border} ${styles.bg} transition-all`}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : chunk.id)}
              className="w-full text-left px-4 py-3 flex items-center gap-3"
            >
              <span className="text-base">{styles.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white/50 text-xs font-mono">
                    {chunk.clauseNumber && `§${chunk.clauseNumber}`}
                  </span>
                  <span className="text-white text-sm font-bold truncate">
                    {chunk.clauseTitle}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40 uppercase">
                    {chunk.clauseType}
                  </span>
                </div>
                {score && (
                  <div className="text-white/40 text-xs mt-0.5 truncate">
                    {score.riskFactors[0]?.description || score.recommendation}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {score && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${styles.badge}`}>
                    {score.score}/10
                  </span>
                )}
                <span className="text-white/30 text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && score && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                {/* Clause text snippet */}
                <div className="text-white/50 text-xs leading-relaxed line-clamp-4 font-sans">
                  {chunk.text.slice(0, 400)}
                  {chunk.text.length > 400 && "..."}
                </div>

                {/* Risk factors */}
                {score.riskFactors.length > 0 && (
                  <div>
                    <div className="text-white/30 text-xs mb-1 tracking-widest">RISK FACTORS</div>
                    {score.riskFactors.map((f, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5">
                        <span className="text-white/60">{f.description}</span>
                        <span className="text-red-400 ml-2">+{f.scoreImpact}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraint violations */}
                {score.constraintViolations.length > 0 && (
                  <div>
                    <div className="text-white/30 text-xs mb-1 tracking-widest">FIRM CONSTRAINTS TRIGGERED</div>
                    {score.constraintViolations.map((v, i) => (
                      <div key={i} className="border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs mb-1">
                        <div className="text-amber-400 font-bold">⚠ [{v.nodeId}] {v.nodeTitle}</div>
                        <div className="text-white/50 mt-0.5">{v.reason}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendation */}
                <div className="border-l-2 border-amber-400/30 pl-3 text-xs text-white/50 font-sans">
                  {score.recommendation}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
