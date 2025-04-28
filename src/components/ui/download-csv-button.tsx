// components/ui/download-csv-button.tsx
"use client";

import React from "react";

interface Props {
  query: string;
  county?: string;
}

export function DownloadCsvButton({ query, county }: Props) {
  const handleDownload = async () => {
    const params = new URLSearchParams({ query, county: county || "" });
    const res = await fetch(`/api/csv?${params.toString()}`);
    if (res.status === 204) {
      alert("No relevant documents found for CSV.");
      return;
    }
    if (!res.ok) {
      console.error("CSV download failed:", await res.text());
      alert("Error downloading CSV.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Download CSV
    </button>
  );
}
