"use client";

import { ChatForm } from "@/components/ui/chat";
import { MessageInput } from "@/components/ui/message-input";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { MessageList } from "@/components/ui/message-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@ai-sdk/react";

export default function Home() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    append,
  } = useChat({
    api: "/api/chat",
  });

  const lastMessage = messages.at(-1);
  const isEmpty = messages.length === 0;
  const isTyping = lastMessage?.role === "user";

  return (
    <div className="w-full h-full flex-1 pb-8 pt-20 flex flex-col justify-start items-center relative px-12">
      <div className="w-full flex-1 flex-grow pb-12 px-12">
        <ScrollArea className="w-full flex-grow">
          {!isEmpty ? (
            <MessageList
              isTyping={isTyping}
              messages={messages}
              showTimeStamps={true}
            />
          ) : (
            <PromptSuggestions
              label="Try one of these prompts!"
              append={append} // This will update the chat input
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
          isPending={isLoading || isTyping}
          handleSubmit={handleSubmit}
        >
          {({ files, setFiles }) => (
            <MessageInput
              className="bg-muted"
              value={input}
              onChange={handleInputChange}
              allowAttachments={false}
              stop={stop}
              isGenerating={isLoading}
              placeholder="Ask Law Navigator..."
            />
          )}
        </ChatForm>

        <footer className="text-center p-2 text-sm text-black dark:text-white mt-4">
          Law Navigator can make mistakes. Check important info.
        </footer>
      </div>
    </div>
  );
}
