"use client";

import { useState } from "react";
import AuthGuard from "@/components/ui/AuthGuard";
import ChatSidebar from "@/components/ui/ChatSidebar";
import ChatWindow from "@/components/ui/ChatWindow";
import { Conversation } from "@/lib/types";

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [view, setView] = useState<"list" | "chat">("list");

  function handleSelect(conversation: Conversation) {
    setActiveConversation(conversation);
    setView("chat");
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-white">
        <div className={`w-full md:w-72 md:shrink-0 md:block ${view === "list" ? "block" : "hidden md:block"}`}>
          <ChatSidebar activeConversation={activeConversation} onSelect={handleSelect} />
        </div>
        <div className={`flex-1 min-w-0 ${view === "chat" ? "flex" : "hidden md:flex"}`}>
          <ChatWindow activeConversation={activeConversation} onBack={() => setView("list")} />
        </div>
      </div>
    </AuthGuard>
  );
}
