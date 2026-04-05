"use client";

import { useState } from "react";
import AuthGuard from "@/components/ui/AuthGuard";
import ChatSidebar from "@/components/ui/ChatSidebar";
import ChatWindow from "@/components/ui/ChatWindow";
import { Chat } from "@/lib/types";

export default function ChatPage() {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [view, setView] = useState<"list" | "chat">("list");

  function handleSelect(chat: Chat) {
    setActiveChat(chat);
    setView("chat");
  }

  function handleBack() {
    setView("list");
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-white">
        {/* Sidebar — full screen on mobile when view=list, always visible on md+ */}
        <div className={`
          w-full md:w-72 md:shrink-0 md:block
          ${view === "list" ? "block" : "hidden md:block"}
        `}>
          <ChatSidebar activeChat={activeChat} onSelect={handleSelect} />
        </div>

        {/* Chat window — full screen on mobile when view=chat, always visible on md+ */}
        <div className={`
          flex-1 min-w-0
          ${view === "chat" ? "flex" : "hidden md:flex"}
        `}>
          <ChatWindow activeChat={activeChat} onBack={handleBack} />
        </div>
      </div>
    </AuthGuard>
  );
}
