import { createClient } from "@supabase/supabase-js";
import EmbeddingsPipeline from "./pipeline";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

type DocumentResult = {
  id: number;
  title: string;
  chapter: string;
  section: string;
  content: string;
  filename: string;
  page: string;
  similarity: number;
};

type MatchDocumentsArgs = {
  query_embedding: number[];
  match_threshold: number;
  match_count: number;
  // add other parameters your RPC function expects
};

const provider = createOpenAICompatible({
  name: "LLAMA-API",
  baseURL: "https://api.llama-api.com",
  apiKey: process.env.LLAMA_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_ANON_KEY ?? ""
);

async function searchDocuments(query: string, top_k = 10) {
  const model = await EmbeddingsPipeline.getInstance();
  const vector = await model(query, { pooling: "mean", normalize: true });
  const tensorData = vector[0].ort_tensor.cpuData;
  const embedding = Array.from(tensorData.slice(0, 384));
  const args = {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 100,
  };
  const { data, error } = await supabase.rpc("match_documents", args);
  const typedData = data as DocumentResult[];
  const results = typedData.map((row) => {
    return {
      title: row["title"],
      chapter: row["chapter"],
      section: row["section"],
      content: row["content"],
      filename: row["filename"],
      page: row["page"],
    };
  });
  return results;
}
async function generateResponse(query: string) {
  const retrievedDocs = await searchDocuments(query);

  // Join the content strings and limit to 1500 characters
  const context = retrievedDocs
    .map((doc) => doc.content)
    .join("\n")
    .substring(0, 1500);

  const prompt = `
You are an expert in legal regulations. Your task is to summarize the key property tax regulations
from the provided legal documents and present them in a clear and structured format.

## **Summary of Key Regulations on Property Tax**
- First, provide a **brief summary** (2-3 sentences) of the key points.
- Then, list the main regulations as **bullet points**, clearly stating the jurisdiction, chapter, and section.
- Finally, include the **source citations** in brackets \`[Source: <Jurisdiction>, Title <X>, Chapter <Y>]\`.

Context:
${context}

Question: ${query}
Answer:
`;

  const results = streamText({
    model: provider("llama3.1-70b"),
    prompt: prompt,
  });

  return results;
}

export async function POST(request: Request) {
  const { messages, id } = await request.json();

  const stream = await generateResponse(messages[0].content);

  return stream.toDataStreamResponse();
}
