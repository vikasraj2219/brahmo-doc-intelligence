"use client";

import { useEffect, useState } from "react";
import { KnowledgeNode, ConstraintViolation } from "@/lib/types";

interface Props {
  activeViolations: ConstraintViolation[];
}

const NODE_STYLES: Record<string, string> = {
  CONSTRAINT: "border-amber-500/30 bg-amber-500/5",
  ANTI_PATTERN: "border-red-500/30 bg-red-500/5",
  DECISION: "border-blue-500/30 bg-blue-500/5",
};

const NODE_BADGE: Record<string, string> = {
  CONSTRAINT: "bg-amber-500/20 text-amber-400",
  ANTI_PATTERN: "bg-red-500/20 text-red-400",
  DECISION: "bg-blue-500/20 text-blue-400",
};

export default function KnowledgePanel({ activeViolations }: Props) {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const triggeredIds = new Set(activeViolations.map((v) => v.nodeId));

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((d) => setNodes(d.nodes || []));
  }, []);

  // Sort: triggered first
  const sorted = [...nodes].sort((a, b) => {
    const aT = triggeredIds.has(a.id) ? 0 : 1;
    const bT = triggeredIds.has(b.id) ? 0 : 1;
    return aT - bT;
  });

  return (
    <div>
      <div className="text-white/30 text-xs tracking-widest mb-4">FIRM KNOWLEDGE BASE</div>
      {triggeredIds.size > 0 && (
        <div className="mb-4 border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <div className="text-amber-400 text-xs font-bold">{triggeredIds.size} CONSTRAINT{triggeredIds.size > 1 ? "S" : ""} TRIGGERED</div>
          <div className="text-white/40 text-xs mt-0.5">Nodes highlighted below</div>
        </div>
      )}
      <div className="space-y-2">
        {sorted.map((node) => {
          const triggered = triggeredIds.has(node.id);
          const styles = NODE_STYLES[node.nodeType] || "";
          const badge = NODE_BADGE[node.nodeType] || "";

          return (
            <div
              key={node.id}
              className={`border px-3 py-2.5 ${styles} ${triggered ? "ring-1 ring-amber-400/50" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {triggered && <span className="text-amber-400 text-xs">⚡</span>}
                <span className="text-white/40 text-xs font-mono">{node.id}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${badge}`}>
                  {node.nodeType}
                </span>
              </div>
              <div className="text-white text-xs font-bold mb-1">{node.title}</div>
              <div className="text-white/50 text-xs leading-relaxed">{node.content}</div>
              {triggered && (
                <div className="mt-2 space-y-1">
                  {activeViolations.filter(v => v.nodeId === node.id).map((v, i) => (
                    <div key={i} className="text-amber-400/70 text-xs border-l border-amber-400/30 pl-2">
                      {v.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
