"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/auth-context";
import { addMedia, type MediaCategory } from "@/app/api/media/actions";

interface MediaFooterProps {
  category: MediaCategory;
  onMediaAdded?: () => void;
  username?: string | null;
}

export default function MediaFooter({
  category,
  onMediaAdded,
  username
}: MediaFooterProps) {
  const { token, user } = useAuth();
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  const [url, setUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Only show the add form for rosie
  const isRosie = user?.username === "rosie";

  const handleAdd = async () => {
    if (!token || !name.trim() || !info.trim() || !url.trim()) return;

    setIsAdding(true);
    const result = await addMedia(
      token,
      category,
      name.trim(),
      info.trim(),
      url.trim()
    );

    if (result.success) {
      setName("");
      setInfo("");
      setUrl("");
      if (onMediaAdded) {
        onMediaAdded();
      }
    }
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      !isAdding &&
      name.trim() &&
      info.trim() &&
      url.trim()
    ) {
      handleAdd();
    }
  };

  const isFormValid = name.trim() && info.trim() && url.trim();

  if (!username) {
    return null;
  }

  return (
    <>
      <div className="absolute bottom-0 px-[var(--spacing-sm)] w-full h-[1.75rem] border-t-[length:var(--border-width)] flex items-center gap-[var(--spacing-sm)]">
        <input
          className="w-[7rem] pixel-borders pixel-input"
          placeholder="media name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          className="w-[12rem] pixel-borders pixel-input"
          placeholder="short info"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          className="w-[3rem] pixel-borders pixel-input"
          placeholder="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="pixel-borders px-[0.325rem] py-0 text-[0.75rem] bg-border text-background hover:bg-accent hover:text-background disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAdd}
          disabled={isAdding || !isFormValid}
        >
          {isAdding ? "..." : "+"}
        </button>
      </div>
    </>
  );
}
