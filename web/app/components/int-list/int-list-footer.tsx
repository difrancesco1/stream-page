"use client";

import { useState } from "react";
import { addIntListEntry } from "@/app/api/int-list/actions";
import { useAuth } from "@/app/context/auth-context";

interface IntListFooterProps {
  onEntryAdded?: () => void;
}

export default function IntListFooter({ onEntryAdded }: IntListFooterProps) {
  const { token, isAuthenticated } = useAuth();
  const [ign, setIgn] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!isAuthenticated || !token) {
      setError("Please log in to add entries");
      return;
    }

    if (!ign.trim() || !reason.trim()) {
      setError("Please fill in both fields");
      return;
    }

    const ignParts = ign.split("#");
    if (ignParts.length !== 2) {
      setError("IGN format: Name#TAG");
      return;
    }

    const [summonerName, tagline] = ignParts;

    setIsLoading(true);
    setError(null);

    const result = await addIntListEntry(
      token,
      summonerName.trim(),
      tagline.trim(),
      reason.trim()
    );

    setIsLoading(false);

    if (result.success) {
      setIgn("");
      setReason("");
      onEntryAdded?.();
    } else {
      setError(result.error || "Failed to add entry");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <div className="px-1 w-full border-t-2 flex flex-col bg-foreground rounded-b">
      {error && <span className="text-[10px] text-red-400 px-1">{error}</span>}
      <div className="h-[28px] flex items-center gap-1 py-1">
        <input
          className="pixel-borders pixel-input w-25"
          placeholder="ign#tag"
          value={ign}
          onChange={(e) => setIgn(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || !isAuthenticated}
        />
        <input
          className="pixel-borders pixel-input w-70"
          placeholder="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || !isAuthenticated}
        />
        <button
          className="pixel-borders pixel-btn-border disabled:opacity-0"
          onClick={handleSubmit}
          disabled={isLoading || !isAuthenticated}
        >
          {isLoading ? "..." : "+"}
        </button>
      </div>
    </div>
  );
}
