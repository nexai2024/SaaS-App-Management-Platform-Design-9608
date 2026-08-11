import React from 'react';

/** Marks rows persisted via notes fallback when the primary NCB table rejected the write. */
const FallbackBadge = ({ className = '' }) => (
  <span
    title="Saved as a note because the primary table rejected this record"
    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
  >
    Stored via fallback
  </span>
);

export default FallbackBadge;
