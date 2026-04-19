"use client";

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { subscribeToConversations, getOrCreateConversation } from "@/lib/chat";
import { Conversation, UserProfile } from "@/lib/types";
import UserSearch from "./UserSearch";

interface Props {
  activeConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
}

export default function ChatSidebar({ activeConversation, onSelect }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, setConversations);
    return () => unsub();
  }, [user]);

  async function handleSelectUser(profile: UserProfile) {
    if (!user) return;
    setCreating(true);
    try {
      const conversationId = await getOrCreateConversation(
        user.uid,
        user.displayName ?? user.email ?? "Unknown",
        user.photoURL ?? "",
        profile.uid,
        profile.displayName,
        profile.photoURL ?? ""
      );

      // Build a local conversation object to select immediately
      onSelect({
        id: conversationId,
        participants: [user.uid, profile.uid],
        participantNames: {
          [user.uid]: user.displayName ?? "",
          [profile.uid]: profile.displayName,
        },
        participantPhotos: {
          [user.uid]: user.photoURL ?? "",
          [profile.uid]: profile.photoURL ?? "",
        },
        lastMessage: "",
        lastMessageAt: null,
        createdAt: null,
      });

      setShowSearch(false);
    } finally {
      setCreating(false);
    }
  }

  const displayName = user?.displayName ?? user?.email ?? "User";
  const avatar = displayName.slice(0, 2).toUpperCase();

  return (
    <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No conversations yet.
          </p>
        ) : (
          conversations.map((c) => {
            // Get the other participant's name
            const otherUid = c.participants.find((p) => p !== user?.uid) ?? "";
            const name = c.participantNames[otherUid] ?? "Unknown";
            const photo = c.participantPhotos[otherUid];

            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                  activeConversation?.id === c.id ? "bg-indigo-50" : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600 overflow-hidden">
                  {photo
                    ? <img src={photo} alt={name} className="h-full w-full object-cover" />
                    : name[0].toUpperCase()
                  }
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                    {c.lastMessageAt && (
                      <span className="text-xs text-gray-400">
                        {formatTime(c.lastMessageAt.toDate())}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500 mt-0.5">
                    {c.lastMessage || "No messages yet"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 p-3 space-y-2">
        {showSearch ? (
          <div className={creating ? "pointer-events-none opacity-50" : ""}>
            <UserSearch
              onSelect={handleSelectUser}
              onClose={() => setShowSearch(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 transition-colors hover:border-indigo-400 hover:text-indigo-600"
          >
            <span className="text-base leading-none">+</span>
            New conversation
          </button>
        )}

        {/* User badge + logout */}
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white overflow-hidden">
            {user?.photoURL
              ? <img src={user.photoURL} alt={displayName} className="h-full w-full object-cover" />
              : avatar
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-green-500">Online</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            title="Sign out"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString();
}
