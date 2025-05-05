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
  { value: "sierra-madre", label: "Sierra Madre (City)" },
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
      alert("Please select a jurisdiction first.");
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
            Select Jurisdiction
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
                  : "Select a jurisdiction above to get started!"
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
                  : "Select a jurisdiction first..."
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
