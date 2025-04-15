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

// 🔹 Search legal documents
async function searchDocuments(query: string) {
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
  return typedData
    .map((row) => row.content)
    .join("\n")
    .slice(0, 1500);
}

// 🔹 Build Claude prompt
function buildPrompt(query: string, context: string): string {
  return `
You are a legal research assistant specializing in California county-level laws.

## SUPPORTED JURISDICTIONS
This system ONLY supports the following jurisdictions:
- Alameda County
- Calaveras County
- Sierra Madre (City)

## QUERY CLASSIFICATION
First, analyze the user's question and determine if it needs clarification:

1. If the question is MISSING LOCATION information:
   → Respond: "Please include your city or county jurisdiction and resubmit your question."

2. If the question is about STATE/FEDERAL-LEVEL laws:
   → Respond: "This system handles only local (county/city) laws. Please consult your state or federal agency."

3. If the question asks for LEGAL ADVICE, OUTCOME PREDICTION, or LIABILITY ASSESSMENT:
   → Respond: "This system cannot provide legal advice or predict outcomes. Please consult an attorney."

4. If the question is VAGUE or SUBJECTIVE:
   → Respond: "Could you clarify the activity and location? Please rephrase your question with more detail."

5. If the question is about a location OUTSIDE SUPPORTED JURISDICTIONS:
   → Respond: "This system currently supports Alameda, Calaveras, and Sierra Madre only. Please resubmit your question using one of these locations."

## HANDLING MISSING CONTEXT
If no context is provided or context is empty:
   → Respond: "I'm sorry but I could not find any related documents to your query."

## RESPONSE GUIDELINES
If the question is valid, does not need clarification, and context is provided, then:

1. Start with a 2-3 sentence factual summary addressing only what the documents support.

2. Then list bullet-point regulations including:
   - A plain-language summary of each rule
   - A source citation in this format: [Source: Alameda County, Title X, Chapter Y, Section Z]

3. If no information is available in the provided context, explain the reason and state:
   "Unfortunately, I don't have the necessary documents to assist you in your request. Please ask about a different topic or jurisdiction."

4. IMPORTANT: Do not speculate, generalize, or mention unrelated jurisdictions or federal/state law.

5. Return only the answer. Do not include system notes or commentary.

6. All responses must be formatted as correct succinct markdown. 

7. FORMAT GUIDELINES:
   - Use proper markdown formatting for all responses
   - Use headers (## or ###) for main sections
   - Ensure bullet points are properly formatted with spaces after the bullet character
   - Include appropriate line breaks between sections
   - Use bold formatting (**text**) for important terms or concepts
   - Maintain consistent indentation for nested lists
   - Use proper markdown citation format for sources
---

## Context (retrieved legal text):
${context}

## Question:
${query}
`;
}

// 🔹 Claude generation (no streaming)
async function generateResponse(query: string) {
  const context = await searchDocuments(query);
  const prompt = buildPrompt(query, context);

  return streamText({
    model: anthropic("claude-3-opus-20240229"),
    system: prompt,
    prompt: query,
  });
}

// 🔹 POST handler
export async function POST(request: Request) {
  const { messages } = await request.json();
  const query = messages[messages.length - 1]?.content || "";
  const result = await generateResponse(query);

  return result.toDataStreamResponse();
}
