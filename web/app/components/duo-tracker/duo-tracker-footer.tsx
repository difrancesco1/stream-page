"use client";

import { useState } from "react";
import { type TrackedAccountData } from "@/app/api/duo/actions";

interface DuoTrackerFooterProps {
  isRosie?: boolean;
  since?: string | null;
  account?: TrackedAccountData | null;
  accountLoading?: boolean;
  onAdd?: (name: string) => void;
  onSetAccount?: (gameName: string, tagLine: string) => void;
  onUpdateAccount?: () => void;
  onOpenOpgg?: () => void;
}

export default function DuoTrackerFooter({
  isRosie,
  since,
  account,
  accountLoading,
  onAdd,
  onSetAccount,
  onUpdateAccount,
  onOpenOpgg,
}: DuoTrackerFooterProps) {
  const [name, setName] = useState("");
  const [accountInput, setAccountInput] = useState("");
  const [showAccountSetup, setShowAccountSetup] = useState(false);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed || !onAdd) return;
    onAdd(trimmed);
    setName("");
  };

  const handleSetAccount = () => {
    const trimmed = accountInput.trim();
    if (!trimmed || !onSetAccount) return;
    const parts = trimmed.split("#");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return;
    onSetAccount(parts[0], parts[1]);
    setAccountInput("");
    setShowAccountSetup(false);
  };

  const openOPGG = () => {
    window.open(
      "https://op.gg/ko/lol/summoners/na/DUO%20ANYONE-ADDME",
      "_blank",
    );
  };

  if (!isRosie) {
    return (
      <div className="px-[var(--spacing-md)] w-full h-[1.75rem] flex items-center border-t-2 gap-[var(--spacing-md)]">
        <button className="main-text truncate" onClick={openOPGG}>
          add
        </button>
        <button
          onClick={onOpenOpgg || openOPGG}
          className="pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none"
        >
          opgg
        </button>
        <button className="main-text truncate opacity-70">+ dm to play</button>
      </div>
    );
  }

  if (accountLoading) {
    return (
      <div className="px-[var(--spacing-sm)] w-full h-[1.75rem] flex items-center border-t-2">
        <span className="main-text opacity-50 text-xs">updating...</span>
      </div>
    );
  }

  if (!account || showAccountSetup) {
    return (
      <div className="px-[var(--spacing-sm)] w-full h-[1.75rem] flex items-center border-t-2 gap-[var(--spacing-sm)]">
        <input
          type="text"
          value={accountInput}
          onChange={(e) => setAccountInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSetAccount()}
          placeholder="your name#tag"
          className="pixel-borders pixel-input w-full cursor-pointer"
        />
        <button
          onClick={handleSetAccount}
          className="pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none text-xs"
        >
          set
        </button>
        {account && (
          <button
            onClick={() => setShowAccountSetup(false)}
            className="pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none text-xs"
          >
            x
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t-2">
      <div className="px-[var(--spacing-sm)] w-full h-[1.75rem] flex items-center gap-[var(--spacing-sm)]">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="name#tag"
          className="pixel-borders pixel-input w-full cursor-pointer"
        />
        <button
          onClick={handleAdd}
          className="pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none"
        >
          +
        </button>
      </div>
      <div className="px-[var(--spacing-sm)] w-full h-[1.25rem] flex items-center gap-[var(--spacing-sm)]">
        <button
          onClick={() => setShowAccountSetup(true)}
          className="main-text text-xs opacity-50 hover:opacity-100 cursor-pointer truncate"
          title={`${account.game_name}#${account.tag_line}`}
        >
          {account.game_name}#{account.tag_line}
        </button>
        <span className="main-text text-xs opacity-30">
          {account.match_count}g
        </span>
        <button
          onClick={onUpdateAccount}
          className="pixel-borders pixel-btn-white-sm hover:bg-background! cursor-pointer select-none main-text text-xs ml-auto"
        >
          sync
        </button>
      </div>
    </div>
  );
}
