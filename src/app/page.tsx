"use client";

import { useState, useRef, useEffect } from "react";
import { DownloadCsvButton } from "@/components/ui/download-csv-button";
import { ChatForm } from "@/components/ui/chat";
import { MessageInput } from "@/components/ui/message-input";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { MessageList } from "@/components/ui/message-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Match the expected type for MessageList and PromptSuggestions
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

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

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [selectedCounty, setSelectedCounty] = useState<string>("");

  // ─── CSV PROMPT STATE ───────────────────────────────────────────
  // When an answer finishes, we’ll ask “Would you like a CSV?”
  const [showCsvPrompt, setShowCsvPrompt] = useState(false);
  // Track whether they clicked Yes (true) or No (false)
  const [wantsCsv, setWantsCsv] = useState<boolean | null>(null);
  // Remember the user’s raw question (no county appended)
  const [lastQuery, setLastQuery] = useState<string>("");
  // ────────────────────────────────────────────────────────────────

  const streamContentRef = useRef("");
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const assistantMessageIdRef = useRef<string>("");

  const isEmpty = messages.length === 0;

  // Load conversation history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem("law-navigator-history");
    const savedCounty = localStorage.getItem("law-navigator-county");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
    if (savedCounty) {
      setSelectedCounty(savedCounty);
    }
  }, []);

  // Save conversation history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("law-navigator-history", JSON.stringify(messages));
    }
    if (selectedCounty) {
      localStorage.setItem("law-navigator-county", selectedCounty);
    }
  }, [messages, selectedCounty]);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const append = (message: { role: "user"; content: string }) => {
    setInput(message.content);
  };

  const handleCountyChange = (newCounty: string) => {
    if (newCounty !== selectedCounty) {
      // Clear messages when changing counties
      setMessages([]);
      localStorage.removeItem("law-navigator-history");
      setSelectedCounty(newCounty);
    }
  };

  const handleSubmit = async (_?: { preventDefault?: () => void }) => {
    _?.preventDefault?.();

    if (!input.trim()) return;

    if (!selectedCounty) {
      alert("Please select a county first.");
      return;
    }

    setLastQuery(input);
    setShowCsvPrompt(false);
    setWantsCsv(null);

    // Check if the input is a greeting
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
        input.toLowerCase().trim() === greeting ||
        input.toLowerCase().trim() === `${greeting}!`
    );

    if (isGreeting) {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: input,
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Hi! How can I help you with legal information about ${
          CALIFORNIA_COUNTIES.find((j) => j.value === selectedCounty)?.label
        } today?`,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
      return;
    }

    // Automatically append the selected county to the query
    const countyLabel = CALIFORNIA_COUNTIES.find(
      (j) => j.value === selectedCounty
    )?.label;
    const queryWithCounty = `${input} in ${countyLabel}`;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input, // Store the original query without county for display
    };

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    assistantMessageIdRef.current = assistantMessage.id;

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);

    const fullResponse = await fetchStreamingResponse(queryWithCounty);
    return fullResponse;
  };

  const clearHistory = () => {
    if (
      window.confirm("Are you sure you want to clear all conversation history?")
    ) {
      setMessages([]);
      stop();
      localStorage.removeItem("law-navigator-county");
      localStorage.removeItem("law-navigator-history");
      setSelectedCounty("");
    }
  };

  const fetchStreamingResponse = async (userInput: string): Promise<string> => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userInput }],
          county: selectedCounty,
        }),
      });
      
      const contentType = response.headers.get("Content-Type") || "";
      console.log("CHAT RESPONSE:", {
        status: response.status,
        contentType,
      });
      
      if (!response.ok) {
        console.error("API request failed:", response.status);
        setIsStreaming(false);
        return "";
      }

      if (!response.body) {
        console.error("No response body");
        setIsStreaming(false);
        return "";
      }
      
      if (response.status === 204) {
        const countyLabel = CALIFORNIA_COUNTIES.find(
          (j) => j.value === selectedCounty
        )?.label;
        const apology = 
        `I'm sorry, ordinances for ${countyLabel} are not available yet. They have not been added to our system. 
        Please try a different county for now, and check back soon as we continue to expand coverage.`;
        // inject apology into the assistant bubble:
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageIdRef.current
              ? { ...msg, content: apology }
              : msg
          )
        );
        setIsStreaming(false);
        // skip the CSV prompt
        return apology;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      streamContentRef.current = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value);

        // Parse AI SDK stream format more robustly
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          // Handle different AI SDK stream formats
          if (line.startsWith("0:") || line.startsWith("2:")) {
            // Extract content from the stream
            let content = line.substring(2).trim();

            // Parse JSON if necessary
            try {
              const parsedContent = JSON.parse(content);
              if (parsedContent.content) {
                content = parsedContent.content;
              }
            } catch {
              // If not JSON, use content as is
            }

            // Remove quotes and unescape characters
            content = content
              .replace(/^"|"$/g, "")
              .replace(/\\n/g, "\n")
              .replace(/\\r/g, "")
              .replace(/\\t/g, "\t")
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, "\\");

            streamContentRef.current += content;
            result += content;

            // Update message content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageIdRef.current
                  ? { ...msg, content: streamContentRef.current }
                  : msg
              )
            );
          }
        }
      }

      setIsStreaming(false);
      setShowCsvPrompt(true);
      return result;
    } catch (error) {
      console.error("Error in fetchStreamingResponse:", error);
      setIsStreaming(false);
      return "";
    }
  };

  return (
    <div className="w-full h-full flex-1 pb-8 pt-8 flex flex-col justify-start items-center relative px-12">
      <div className="w-full flex-1 flex-grow pb-12 px-12">
        <div className="mb-12 flex items-center justify-center gap-4">
          <Label className="text-lg font-medium" htmlFor="county-selector">
            Select County
          </Label>
          <Select value={selectedCounty} onValueChange={handleCountyChange}>
            <SelectTrigger
              className="w-[300px] px-3 py-2 border rounded-md bg-background"
              id="county-selector"
            >
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent className="w-[300px]">
              {CALIFORNIA_COUNTIES.map((jurisdiction) => (
                <SelectItem key={jurisdiction.value} value={jurisdiction.value}>
                  {jurisdiction.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="w-full flex-grow">
          {!isEmpty ? (
            <MessageList
              isTyping={isStreaming}
              messages={messages}
              showTimeStamps={true}
            />
          ) : (
            <PromptSuggestions
              label={
                selectedCounty
                  ? `Try one of these prompts - or ask your own question for ${
                      CALIFORNIA_COUNTIES.find(
                        (j) => j.value === selectedCounty
                      )?.label
                    }:`
                  : "Select a county above to get started!"
              }
              append={append}
              suggestions={
                selectedCounty
                  ? [
                      "What are the short-term rental regulations?",
                      "What are the property tax rates?",
                      "What are the noise ordinance rules?",
                      "What are the building permit requirements?",
                      "What are the zoning regulations?",
                    ]
                  : []
              }
            />
          )}
        </ScrollArea>
      </div>
      <div className="w-full sticky bottom-0 pt-2 bg-background px-12">
        <ChatForm
          className="w-full p-0 m-0 border-0"
          isPending={isStreaming}
          handleSubmit={handleSubmit}
        >
          {() => (
            <MessageInput
              className="bg-muted"
              value={input}
              onChange={handleInputChange}
              allowAttachments={false}
              stop={() => {
                if (streamIntervalRef.current) {
                  clearInterval(streamIntervalRef.current);
                  setIsStreaming(false);
                }
              }}
              isGenerating={isStreaming}
              placeholder={
                selectedCounty
                  ? `Ask about ${
                      CALIFORNIA_COUNTIES.find(
                        (j) => j.value === selectedCounty
                      )?.label
                    }...`
                  : "Select a county first..."
              }
              disabled={!selectedCounty}
            />
          )}
        </ChatForm>

        {/* ─── CSV PROMPT ─────────────────────────────────────────────── */}
        {showCsvPrompt && wantsCsv === null && (
          <div className="p-4 border-t flex items-center justify-center space-x-4">
            <span>Would you like a copy of the raw data used for this response?</span>
            <button
              onClick={() => setWantsCsv(true)}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              Yes
            </button>
            <button
              onClick={() => setWantsCsv(false)}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              No
            </button>
          </div>
        )}

        {/* ─── DOWNLOAD BUTTON ─────────────────────────────────────────── */}
        {wantsCsv && (
          <div className="p-4 border-t flex justify-center">
            <DownloadCsvButton query={lastQuery} county={selectedCounty} />
          </div>
        )}

        <div className="relative flex items-center justify-center mt-4">
          <footer className="text-center p-2 text-sm text-black dark:text-white">
            UnBarred does not provide legal advice. Always verify
            information independently.
          </footer>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="absolute right-0 text-sm text-red-500 hover:text-red-700"
            >
              Clear History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
