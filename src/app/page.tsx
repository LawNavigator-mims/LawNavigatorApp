"use client";

import { Button } from "@/components/ui/button";
import { ChatForm } from "@/components/ui/chat";
import { MessageInput } from "@/components/ui/message-input";
// import Image from "next/image";
// import Link from "next/link";
import { useRef, useState } from "react";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { ChatMessageProps, Message } from "@/components/ui/chat-message";
import { MessageList } from "@/components/ui/message-list";
import { ScrollArea } from "@/components/ui/scroll-area";

type QueryResponseType = {
  query: string;
  response: string;
};

export default function Home() {
  const [value, setValue] = useState("");
  const [fetchingValue, setFetchingValue] = useState("");
  const [chats, setChats] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const timeout = useRef<number | null>(null);

  const cancelTimeout = () => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }
  };

  const setNewTimeout = (callback: () => void, ms: number) => {
    cancelTimeout();
    const id = window.setTimeout(callback, ms);
    timeout.current = id;
  };

  const updateChat = (newChat: Message) => {
    setChats((prevChats) => [...prevChats, newChat]);
  };

  const onSubmit = async () => {
    const latestId = chats.length > 0 ? chats[chats.length - 1].id : "0";
    updateChat({
      id: String(parseInt(latestId) + 1),
      role: "user",
      content: value,
      createdAt: new Date(),
    });

    const obj = {
      text: value,
    };

    setValue("");
    setIsGenerating(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

      const response = await fetch(`${baseUrl}/search/?top_k=1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(obj),
      });
      const res = (await response.json()) as QueryResponseType;
      console.log("Full API Response:", res.response);

      // Update chat
      setChats((prevChats) => [
        ...prevChats,
        {
          id: String(parseInt(latestId) + 2),
          role: "assistant",
          content: res.response,
          createdAt: new Date(),
        },
      ]);
    } catch (e) {
      console.error("Found error", e);
    }
    setIsGenerating(false);
  };

  return (
    <div className="w-full h-full flex-1 pb-8 pt-20 flex flex-col justify-start items-center relative">
      <div className="w-full flex-1 flex-grow pb-12 px-12">
        <ScrollArea className="w-full flex-grow">
          {chats.length > 0 ? (
            <MessageList isTyping={isGenerating} messages={chats} />
          ) : (
            <PromptSuggestions
              label="Try one of these prompts!"
              append={(message) => setValue(message.content)} // This will update the chat input
              suggestions={[
                "Is a verbal contract legally binding?",
                "What are the key regulations on property tax in Sierra_Madre?",
                "How do I dispute a traffic ticket?",
              ]}
            />
          )}
        </ScrollArea>
      </div>
      <div className="w-full sticky bottom-0 pt-2 bg-background px-12">
        <ChatForm
          className="w-full p-0 m-0 border-0"
          isPending={false}
          handleSubmit={async (event) => {
            event?.preventDefault?.();
            await onSubmit();
          }}
        >
          {({ files, setFiles }) => (
            <MessageInput
              className="bg-muted"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
              }}
              allowAttachments={false}
              stop={() => {
                setIsGenerating(false);
                cancelTimeout();
              }}
              isGenerating={isGenerating}
              placeholder="Ask Law Navigator..."
            />
          )}
        </ChatForm>

        {/* Disclaimer at the bottom */}
        <footer className="text-center p-2 text-sm text-black dark:text-white mt-4">
          Law Navigator can make mistakes. Check important info.
        </footer>
      </div>
    </div>
  );
}
