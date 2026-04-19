"use client";

import { useState, useEffect, useRef } from "react";
import { searchUsers } from "@/lib/user";
import { useAuth } from "@/lib/AuthContext";
import { UserProfile } from "@/lib/types";

interface Props {
  onSelect: (user: UserProfile) => void;
  onClose: () => void;
}

export default function UserSearch({ onSelect, onClose }: Props) {
  const { user } = useAuth();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!term.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (!user) return;
      setSearching(true);
      try {
        const found = await searchUsers(term.trim(), user.uid);
        setResults(found);
        setSearched(true);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [term, user]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-indigo-400 bg-white px-3 py-1.5 ring-2 ring-indigo-500/20">
        <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name or email..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
        {searching && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        )}
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {searched && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-gray-400 text-center">
              No registered users found.
            </p>
          ) : (
            results.map((u) => (
              <button
                key={u.uid}
                onClick={() => onSelect(u)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 overflow-hidden">
                  {u.photoURL
                    ? <img src={u.photoURL} alt={u.displayName} className="h-full w-full object-cover" />
                    : u.displayName.slice(0, 2).toUpperCase()
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.displayName}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
