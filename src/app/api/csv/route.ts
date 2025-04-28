// app/api/csv/route.ts
import { NextResponse } from "next/server";
import { createClient }  from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query  = searchParams.get("query")  || "";
  const county = searchParams.get("county") || "";

  // 1) Embed
  const embedRes = await supabase.functions.invoke("generate-embeddings", {
    body: { input: query },
  });
  if (embedRes.error) {
    return NextResponse.json({ error: embedRes.error.message }, { status: 500 });
  }
  const embedding = Object.values((embedRes.data as any).embedding) as number[];

  // 2) Call RPC just for IDs
  const { data: matches, error: matchErr } = await supabase.rpc(
    "match_documents",
    {
      query_embedding: embedding,
      match_threshold:  0.1,
      match_count:      10,
    }
  );
  if (matchErr) {
    return NextResponse.json({ error: matchErr.message }, { status: 500 });
  }
  const ids = (matches || []).map((m: any) => m.id).filter(Boolean);
  if (ids.length === 0) {
    return new Response(null, { status: 204 });
  }

  // 3) Re-fetch full rows with the six desired columns
  let builder = supabase
    .from("documents")
    .select("title,chapter,section,content,county,filename")
    .in("id", ids);

  // // 4) Now apply county filter against the real data
  // if (county) {
  //   builder = builder.eq("county", county);
  // }

  const { data: rows, error: rowErr } = await builder;
  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return new Response(null, { status: 204 });
  }

  // 5) Build CSV (no 'article' column)
  const cols   = ["title","chapter","section","content","county","filename"];
  const header = cols.join(",") + "\n";
  const body   = rows
    .map((r) =>
      cols
        .map((c) => `"${String((r as any)[c] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const csv = header + body;

  // 6) Return as attachment
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="data.csv"`,
    },
  });
}
