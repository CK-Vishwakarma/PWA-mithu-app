"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { sendMessage, sendImageMessage, subscribeToMessages } from "@/lib/chat";
import { Conversation, Message } from "@/lib/types";

interface Props {
  activeConversation: Conversation | null;
  onBack: () => void;
}

export default function ChatWindow({ activeConversation, onBack }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeConversation) return;
    setMessages([]);
    const unsub = subscribeToMessages(activeConversation.id, setMessages);
    return () => unsub();
  }, [activeConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    setError("");
    if (!input.trim() || !activeConversation || !user) return;
    setSending(true);
    try {
      await sendMessage(activeConversation.id, user.uid, input.trim());
      setInput("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !activeConversation || !user) return;

    e.target.value = "";
    setError("");
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(`0 / ${files.length}`);

    let completed = 0;

    await Promise.all(
      files.map(async (file) => {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contentType: file.type,
              size: file.size,
              chatId: activeConversation.id,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Upload failed.");

          await uploadToS3(data.uploadUrl, file, (pct) => {
            setUploadProgress(Math.round(
              ((completed + pct / 100) / files.length) * 100
            ));
          });

          await sendImageMessage(activeConversation.id, user.uid, data.publicUrl);

          completed++;
          setUploadStatus(`${completed} / ${files.length}`);
          setUploadProgress(Math.round((completed / files.length) * 100));
        } catch (err: unknown) {
          completed++;
          setError(err instanceof Error ? err.message : "Upload failed.");
        }
      })
    );

    setUploading(false);
    setUploadProgress(0);
    setUploadStatus("");
  }

  // Get the other participant's name for the header
  const otherUid = activeConversation?.participants.find((p) => p !== user?.uid) ?? "";
  const otherName = activeConversation?.participantNames[otherUid] ?? "Unknown";
  const otherPhoto = activeConversation?.participantPhotos[otherUid];

  if (!activeConversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-400">Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4 gap-3">
        <button
          onClick={onBack}
          className="md:hidden shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Back"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600 overflow-hidden">
          {otherPhoto
            ? <img src={otherPhoto} alt={otherName} className="h-full w-full object-cover" />
            : otherName[0]?.toUpperCase()
          }
        </div>
        <p className="text-sm font-semibold text-gray-900">{otherName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 space-y-2">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                {msg.type === "image" && msg.imageUrl ? (
                  <div className={`max-w-[60%] overflow-hidden rounded-2xl ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                    <Image
                      src={msg.imageUrl}
                      alt="Image"
                      width={300}
                      height={300}
                      className="object-cover w-full h-auto cursor-pointer"
                      onClick={() => window.open(msg.imageUrl, "_blank")}
                    />
                  </div>
                ) : (
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="px-4 md:px-6 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {uploadStatus} · {uploadProgress}%
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 px-4 py-4 md:px-6">
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            className="shrink-0 text-gray-400 hover:text-indigo-500 transition-colors disabled:opacity-40"
            aria-label="Upload image"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sending || uploading}
          />

          <button
            onClick={handleSend}
            disabled={sending || uploading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
}

function uploadToS3(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error(`S3 upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error."));
    xhr.send(file);
  });
}
