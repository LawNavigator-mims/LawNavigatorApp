// src/app/api/csv/route.ts
import { NextResponse } from "next/server";
import { createClient }   from "@supabase/supabase-js";

type DocumentResult = {
  id: number; 
  title: string;
  chapter: string;
  section: string;
  content: string;
  filename: string;
  page: string;
  county: string;
  similarity: number;  // double precision
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query  = searchParams.get("query")  || "";
  const county = searchParams.get("county") || "";

  // 1) Generate embedding for the query
  const { data: embedData, error: embedErr } = 
    await supabase.functions.invoke("generate-embeddings", {
      body: { input: query },
    });
  if (embedErr) {
    console.error("Embedding error:", embedErr);
    return NextResponse.json({ error: embedErr.message }, { status: 500 });
  }
  const embedding = Object.values((embedData as any).embedding) as number[];

  // 2) Call the county‑scoped RPC exactly as in chat/route.ts (no generics)
  const args = {
    county_param:     county,
    query_embedding:  embedding,
    match_threshold:  0.1,
    match_count:      10,
  };

  const rpc = await supabase.rpc("match_documents_by_county", args);
  if (rpc.error) {
    console.error("🚨 CSV‑RPC error:", rpc.error);
    return NextResponse.json({ error: rpc.error.message }, { status: 500 });
  }

  // cast to the correct type
  const docs = (rpc.data ?? []) as DocumentResult[];

  // 3) If no matches, return 204 No Content
  if (docs.length === 0) {
    return new Response(null, { status: 204 });
  }

  // 4) Build CSV (dropping id, page, similarity)
  const cols   = ["title","chapter","section","content","county","filename"];
  const header = cols.join(",") + "\n";
  const body   = docs
    .map((r) =>
      cols
        .map((c) => `"${String((r as any)[c] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const csv = header + body;

  // 5) Return it as a downloadable attachment
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="results.csv"`,
    },
  });
}
