// app/api/chat/route.ts

import { createClient } from "@supabase/supabase-js";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

// 🔹 Define document result type
type DocumentResult = {
  id: string;
  title: string;
  chapter: string;
  section: string;
  content: string;
  filename: string;
  page: string;
  county: string;
  similarity: number;
};

type EmbeddingResult = {
  embedding: { [key: string]: number };
};

// 🔹 Supabase client setup
const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_ANON_KEY ?? ""
);

// Map of county values to their full names
const CALIFORNIA_COUNTIES = [
  { value: "Alameda County", label: "Alameda County" },
  { value: "Alpine County", label: "Alpine County" },
  { value: "Amador County", label: "Amador County" },
  { value: "Butte County", label: "Butte County" },
  { value: "Calaveras County", label: "Calaveras County" },
  { value: "Colusa County", label: "Colusa County" },
  { value: "Contra Costa County", label: "Contra Costa County" },
  { value: "Del Norte County", label: "Del Norte County" },
  { value: "El Dorado County", label: "El Dorado County" },
  { value: "Fresno County", label: "Fresno County" },
  { value: "Glenn County", label: "Glenn County" },
  { value: "Humboldt County", label: "Humboldt County" },
  { value: "Imperial County", label: "Imperial County" },
  { value: "Inyo County", label: "Inyo County" },
  { value: "Kern County", label: "Kern County" },
  { value: "Kings County", label: "Kings County" },
  { value: "Lake County", label: "Lake County" },
  { value: "Lassen County", label: "Lassen County" },
  { value: "Los Angeles County", label: "Los Angeles County" },
  { value: "Madera County", label: "Madera County" },
  { value: "Marin County", label: "Marin County" },
  { value: "Mariposa County", label: "Mariposa County" },
  { value: "Mendocino County", label: "Mendocino County" },
  { value: "Merced County", label: "Merced County" },
  { value: "Modoc County", label: "Modoc County" },
  { value: "Mono County", label: "Mono County" },
  { value: "Monterey County", label: "Monterey County" },
  { value: "Napa County", label: "Napa County" },
  { value: "Nevada County", label: "Nevada County" },
  { value: "Orange County", label: "Orange County" },
  { value: "Placer County", label: "Placer County" },
  { value: "Plumas County", label: "Plumas County" },
  { value: "Riverside County", label: "Riverside County" },
  { value: "Sacramento County", label: "Sacramento County" },
  { value: "San Benito County", label: "San Benito County" },
  { value: "San Bernadino County", label: "San Bernardino County" },
  { value: "SAN DIEGO COUNTY", label: "San Diego County" },
  { value: "san-francisco", label: "San Francisco County" },
  { value: "San Joaquin County", label: "San Joaquin County" },
  { value: "San Luis Obispo County", label: "San Luis Obispo County" },
  { value: "San Mateo County", label: "San Mateo County" },
  { value: "Santa Barbara County", label: "Santa Barbara County" },
  { value: "Santa Clara County", label: "Santa Clara County" },
  { value: "Santa Cruz County", label: "Santa Cruz County" },
  { value: "Shasta County", label: "Shasta County" },
  { value: "Sierra County", label: "Sierra County" },
  { value: "Siskiyou County", label: "Siskiyou County" },
  { value: "Solano County", label: "Solano County" },
  { value: "Sonoma County", label: "Sonoma County" },
  { value: "Stanislaus County", label: "Stanislaus County" },
  { value: "Sutter County", label: "Sutter County" },
  { value: "Tehama County", label: "Tehama County" },
  { value: "Trinity County", label: "Trinity County" },
  { value: "Tulare county", label: "Tulare County" },
  { value: "Tuolumne County", label: "Tuolumne County" },
  { value: "Ventura County", label: "Ventura County" },
  { value: "Yolo County", label: "Yolo County" },
  { value: "Yuba County", label: "Yuba County" },
];

const SUPPORTED_COUNTIES = [
  "Amador County California",
  "Yuba County",
  "Sierra Madre",
  "Calaveras County",
  "Solano County",
  "Alameda County",
  "Alpine County",
  "Stanislaus County",
  "Yolo County",
  "Lassen County",
  "Inyo County",
  "Merced County",
  "Placer County",
  "San Benito County",
  "San Diego",
  "San Bernardino",
];

async function searchDocuments(query: string, county?: string) {
  if (!county) return "";

  // 1) embed
  const { data: embedData, error: embedErr } =
    await supabase.functions.invoke("generate-embeddings", {
      body: { input: query },
    });
  if (embedErr) {
    console.error("Embedding error:", embedErr);
    return "";
  }
  const embedding = Object.values((embedData as any).embedding) as number[];

  const args = {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 100,
    county_param: county,      // exact label from county list in supabase
  };
  const rpc = await supabase.rpc("match_documents_by_county", args);
  if (rpc.error) {
    console.error("RPC error:", rpc.error);
    return "";
  }
  const docs = (rpc.data ?? []) as DocumentResult[];

  if (!docs.length) return "";

  return docs
    .slice(0, 10)
    .map((d) => d.content)
    .join("\n")
    .slice(0, 2000);
}

function buildPrompt(query: string, context: string, county?: string): string {
  let selectedCounty = "unspecified jurisdiction";

  if (county) {
    const countyInfo = CALIFORNIA_COUNTIES.find((j) => j.value === county);
    selectedCounty = countyInfo ? countyInfo.label : "unspecified jurisdiction";
  }

  // Check if the query is a greeting
  const greetings = [
    "hi",
    "hello",
    "hey",
    "greetings",
    "good morning",
    "good afternoon",
    "good evening",
  ];
  const isGreeting = greetings.some(
    (greeting) =>
      query.toLowerCase().trim() === greeting ||
      query.toLowerCase().trim() === `${greeting}!` ||
      query.toLowerCase().includes(`${greeting} in `)
  );

  if (isGreeting) {
    return `You are a friendly legal research assistant.

The user has sent a greeting. Please respond with a polite greeting and offer help with legal information about ${selectedCounty}.

Respond with something like: "Hi! How can I help you with legal information about ${selectedCounty} today?"

Keep the response brief and friendly.
`;
  }

  return `

You are a legal research assistant specializing in California county-level laws.

## CURRENT JURISDICTION
The user has selected: ${selectedCounty}
You should only provide information relevant to this jurisdiction.

## SUPPORTED JURISDICTIONS
// This system currently has legal documents for:
// - Sierra Madre (City)
// - Amador County California  
// - Yuba County  
// - Calaveras County  
// - Solano County  
// - Alameda County  
// - Alpine County  
// - Stanislaus County  
// - Yolo County  
// - Lassen County  
// - Inyo County  
// - Merced County  
// - Placer County  
// - San Benito County  
// - San Diego  
// - San Bernardino 

Start with a Yes / No / Unclear summary line before diving into details.

## QUERY CLASSIFICATION
1. If no relevant documents are found in the context for the selected county:
   → Respond: "I'm sorry but I could not find any related documents about ${query} in ${selectedCounty}. Please try a different topic or query."

2. If the question asks for LEGAL ADVICE, OUTCOME PREDICTION, or LIABILITY ASSESSMENT:
   → Respond: "This system cannot provide legal advice or predict outcomes. Please consult an attorney."

3. If the question is about STATE/FEDERAL-LEVEL laws:
   → Respond: "This system handles only local (county/city) laws. Please consult your state or federal agency."

4. If the question is VAGUE or SUBJECTIVE:
   → Respond: "Could you clarify the activity and location? Please rephrase your question with more detail."

## RESPONSE GUIDELINES
If the question is valid and context is provided for a supported jurisdiction, then provide a single continuous paragraph response:

1. Write a clear, factual paragraph that addresses only what the documents support.

2. Include relevant information with source citations integrated naturally into the paragraph using this format: [Source: ${selectedCounty}, Title X, Chapter Y, Section Z]

3. Do not use headings, bullet points, lists, or any markdown formatting.

4. Return only the answer as a plain text paragraph. Do not include system notes or commentary.

---

## Context (retrieved legal text):
${context}

## Question:
${query}
`;
}

// 🔹 Claude generation
async function generateResponse(query: string, county?: string) {
  const context = await searchDocuments(query, county);
  const prompt = buildPrompt(query, context, county);

  return streamText({
    model: anthropic("claude-3-opus-20240229"),
    system: prompt,
    prompt: query,
  });
}

// 🔹 POST handler
export async function POST(request: Request) {
  try {
    const { messages, county } = await request.json();
    const query = messages[messages.length - 1]?.content || "";

    // Early‑exit if we have no documents for the chosen county
    if (county) {
      const { count, error } = await supabase
        .from("documents")
        .select("id", { head: true, count: "exact" })
        .eq("county", county);

      if (error) console.error("Count check error:", error);

      // if there really are zero rows for that county, bail out
      // simple exit: if no documents → 204 No Content
      if (count === 0) {
        return new Response(null, { status: 204 });
      }
    }

    const result = await generateResponse(query, county);
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
