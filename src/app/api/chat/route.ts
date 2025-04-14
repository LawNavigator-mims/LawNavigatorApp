// app/api/chat/route.ts

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// 🔹 Classify query with Claude
async function classifyQueryAndGenerateFollowup(query: string): Promise<string> {
  const prompt = `
You are a legal research assistant.

Your job is to analyze a user's legal question and decide whether it is specific and answerable based on **local county laws** in California.
⚠️ The system only supports: **Alameda County, Calaveras County, and Sierra Madre.**

If the question is clear and supported, return an empty string.

If the question falls into one of the categories below, return a short follow-up message asking for clarification:

1. **Missing Location**
   → Ask: "Please include your city or county jurisdiction and resubmit your question."

2. **State/Federal-Level Question**
   → Ask: "This system handles only local (county/city) laws. Please consult your state or federal agency."

3. **Legal Outcome or Liability Prediction**
   → Ask: "This system cannot provide legal advice or predict outcomes. Please consult an attorney."

4. **Vague or Subjective Question**
   → Ask: "Could you clarify the activity and location? Please rephrase your question with more detail."

5. **Outside Supported Jurisdictions**
   → Ask: "This system currently supports Alameda, Calaveras, and Sierra Madre only. Please resubmit your question using one of these locations."

User question:
"${query}"

Return only the follow-up message as plain text. If no clarification is needed, return an empty string.
`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229",
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const json = await res.json();
  console.log("🧠 Claude classify response:", json);
  return json?.content?.[0]?.text?.trim() ?? "";
}

// 🔹 Search legal documents
async function searchDocuments(query: string) {
  const { data: embeddingData } = await supabase.functions.invoke("generate-embeddings", {
    body: { input: query },
  });

  const embeddingResult = embeddingData as EmbeddingResult;
  const embedding = Array.from(Object.values(embeddingResult.embedding));

  const args = {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 100,
  };

  const { data, error } = await supabase.rpc("match_documents", args);
  if (error) {
    console.error("❌ Supabase RPC error:", error.message);
    throw new Error("Could not find relevant documents");
  }

  const typedData = data as DocumentResult[];
  return typedData.map((row) => row.content).join("\n").slice(0, 1500);
}

// 🔹 Build Claude prompt
function buildPrompt(query: string, context: string): string {
  return `
You are a legal research assistant specializing in **California county-level laws**.

⚠ Your system supports **only** the following jurisdictions:
- Alameda County
- Calaveras County
- Sierra Madre (City)

You have access to a collection of retrieved legal documents (see "Context"). Using these, answer the user’s local legal question.

---

## Guidelines:

1. **Summarize clearly** in 2–3 factual sentences. Address only what the documents support.
2. Then list **bullet-point regulations**, including:
   - A plain-language summary of each rule
   - A source citation in this format:
     \`[Source: Alameda County, Title X, Chapter Y, Section Z]\`
3. If no information is available, explain the reason, and return:
   \`"The information is not available in the current documents. **reason**"\`
4. ❗ Do not speculate, generalize, or mention unrelated jurisdictions or federal/state law.
5. Return **only the answer**. Do not include system notes or commentary.

---

## Context (retrieved legal text):
${context}

## Question:
${query}

## Answer:
`;
}

// 🔹 Claude generation (no streaming)
async function generateResponse(query: string): Promise<string> {
  const context = await searchDocuments(query);
  const prompt = buildPrompt(query, context);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const json = await res.json();
  console.log("🧠 Claude answer response:", json);
  return json?.content?.[0]?.text?.trim() ?? "❌ Claude returned no response.";
}

// 🔹 POST handler
export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const query = messages[messages.length - 1]?.content || "";

    // Classify before generating full answer
    const clarification = await classifyQueryAndGenerateFollowup(query);
    if (clarification) {
      return new Response(JSON.stringify({ response: clarification }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const result = await generateResponse(query);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunk = JSON.stringify({ response: result });
        controller.enqueue(encoder.encode(chunk));
        controller.close();
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Transfer-Encoding": "chunked"
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error("❌ API error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500
    });
  }
}
