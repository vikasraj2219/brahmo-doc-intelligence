"use client";

import { useCallback, useState } from "react";

interface Props {
  onUpload: (file: File) => void;
  label?: string;
  compact?: boolean;
}

export default function DocumentUpload({ onUpload, label = "Upload Document", compact = false }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  if (compact) {
    return (
      <label className="cursor-pointer inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-xs hover:border-amber-400/50 hover:text-amber-400 transition-all">
        <span>+</span> {label}
        <input type="file" accept=".docx,.pdf,.txt" onChange={handleChange} className="hidden" />
      </label>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`block border-2 border-dashed rounded cursor-pointer p-12 text-center transition-all ${
        dragging
          ? "border-amber-400 bg-amber-400/5"
          : "border-white/20 hover:border-white/40"
      }`}
    >
      <div className="text-4xl mb-4">📄</div>
      <div className="text-white font-bold mb-1">{label}</div>
      <div className="text-white/40 text-sm">Drag & drop or click to browse</div>
      <div className="text-white/30 text-xs mt-2">DOCX · PDF · TXT</div>
      <input type="file" accept=".docx,.pdf,.txt" onChange={handleChange} className="hidden" />
    </label>
  );
}
