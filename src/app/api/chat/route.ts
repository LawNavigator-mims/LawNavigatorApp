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
  { value: "alameda", label: "Alameda County" },
  { value: "alpine", label: "Alpine County" },
  { value: "amador", label: "Amador County" },
  { value: "butte", label: "Butte County" },
  { value: "calaveras", label: "Calaveras County" },
  { value: "colusa", label: "Colusa County" },
  { value: "contra-costa", label: "Contra Costa County" },
  { value: "del-norte", label: "Del Norte County" },
  { value: "el-dorado", label: "El Dorado County" },
  { value: "fresno", label: "Fresno County" },
  { value: "glenn", label: "Glenn County" },
  { value: "humboldt", label: "Humboldt County" },
  { value: "imperial", label: "Imperial County" },
  { value: "inyo", label: "Inyo County" },
  { value: "kern", label: "Kern County" },
  { value: "kings", label: "Kings County" },
  { value: "lake", label: "Lake County" },
  { value: "lassen", label: "Lassen County" },
  { value: "los-angeles", label: "Los Angeles County" },
  { value: "madera", label: "Madera County" },
  { value: "marin", label: "Marin County" },
  { value: "mariposa", label: "Mariposa County" },
  { value: "mendocino", label: "Mendocino County" },
  { value: "merced", label: "Merced County" },
  { value: "modoc", label: "Modoc County" },
  { value: "mono", label: "Mono County" },
  { value: "monterey", label: "Monterey County" },
  { value: "napa", label: "Napa County" },
  { value: "nevada", label: "Nevada County" },
  { value: "orange", label: "Orange County" },
  { value: "placer", label: "Placer County" },
  { value: "plumas", label: "Plumas County" },
  { value: "riverside", label: "Riverside County" },
  { value: "sacramento", label: "Sacramento County" },
  { value: "san-benito", label: "San Benito County" },
  { value: "san-bernardino", label: "San Bernardino County" },
  { value: "san-diego", label: "San Diego County" },
  { value: "san-francisco", label: "San Francisco County" },
  { value: "san-joaquin", label: "San Joaquin County" },
  { value: "san-luis-obispo", label: "San Luis Obispo County" },
  { value: "san-mateo", label: "San Mateo County" },
  { value: "santa-barbara", label: "Santa Barbara County" },
  { value: "santa-clara", label: "Santa Clara County" },
  { value: "santa-cruz", label: "Santa Cruz County" },
  { value: "shasta", label: "Shasta County" },
  { value: "sierra", label: "Sierra County" },
  { value: "siskiyou", label: "Siskiyou County" },
  { value: "solano", label: "Solano County" },
  { value: "sonoma", label: "Sonoma County" },
  { value: "stanislaus", label: "Stanislaus County" },
  { value: "sutter", label: "Sutter County" },
  { value: "tehama", label: "Tehama County" },
  { value: "trinity", label: "Trinity County" },
  { value: "tulare", label: "Tulare County" },
  { value: "tuolumne", label: "Tuolumne County" },
  { value: "ventura", label: "Ventura County" },
  { value: "yolo", label: "Yolo County" },
  { value: "yuba", label: "Yuba County" },
  { value: "sierra-madre", label: "Sierra Madre" },
];

async function searchDocuments(query: string, county?: string) {
  console.log("Searching for:", query, "in county:", county);

  const { data: embeddingData } = await supabase.functions.invoke(
    "generate-embeddings",
    {
      body: { input: query },
    }
  );

  const embeddingResult = embeddingData as EmbeddingResult;
  const embedding = Array.from(Object.values(embeddingResult.embedding));

  const args = {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 100,
  };
  const { data, error } = await supabase.rpc("match_documents", args);
  if (error) {
    console.error("❌ Supabase RPC error:", error.message);
    return " ";
  }

  const typedData = data as DocumentResult[];

  // Filter documents by county if provided
  const filteredDocs = county
    ? typedData.filter((row) => {
        // More flexible county matching
        const docCounty = row.county?.toLowerCase() || "";
        const searchCounty = county.toLowerCase();

        // Check if document county includes search county or vice versa
        return (
          docCounty.includes(searchCounty) || searchCounty.includes(docCounty)
        );
      })
    : typedData;

  console.log(`Found ${filteredDocs.length} documents for ${county}`);

  // If no documents found for the specific county, return empty string
  if (filteredDocs.length === 0) {
    return "";
  }

  return filteredDocs
    .slice(0, 10) // Limit to top 10 most relevant documents
    .map((row) => row.content)
    .join("\n")
    .slice(0, 2000); // Increased from 1500 to 2000 for more context
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
This system currently has legal documents for:
- Sierra Madre (City)
- Amador County California  
- Yuba County  
- Calaveras County  
- Solano County  
- Alameda County  
- Alpine County  
- Stanislaus County  
- Yolo County  
- Lassen County  
- Inyo County  
- Merced County  
- Placer County  
- San Benito County  
- San Diego  
- San Bernardino 

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
  const { messages, county } = await request.json();
  const query = messages[messages.length - 1]?.content || "";
  const result = await generateResponse(query, county);

  return result.toDataStreamResponse();
}
