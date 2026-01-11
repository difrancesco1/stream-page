"use client";

import { useRef, useCallback } from "react";

interface OppggCardFooterProps {
  tier?: string | null;
  rank?: string | null;
  leaguePoints?: number | null;
  onAddAccount: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isLoading: boolean;
  hasAccounts: boolean;
  onEasterEggTrigger?: () => void;
  onLpClick?: () => void;
  userName?: string | null;
}

export default function OppggCardFooter({
  tier,
  userName,
  rank,
  leaguePoints,
  onAddAccount,
  onRefresh,
  isRefreshing,
  isLoading,
  hasAccounts,
  onEasterEggTrigger,
  onLpClick,
}: OppggCardFooterProps) {
  const displayTier = tier || "x";
  const displayLp =
    leaguePoints !== null && leaguePoints !== undefined
      ? `${leaguePoints}lp`
      : "";

  // Track click timestamps for easter egg detection
  const clickTimestamps = useRef<number[]>([]);

  const handleRankClick = useCallback(() => {
    const now = Date.now();
    // Keep only clicks within last 2 seconds
    clickTimestamps.current = clickTimestamps.current.filter(
      (t) => now - t < 2000
    );
    clickTimestamps.current.push(now);

    // Check for 10 clicks in quick succession
    if (clickTimestamps.current.length >= 10) {
      clickTimestamps.current = []; // Reset
      onEasterEggTrigger?.();
    } else {
      onLpClick?.();
    }
  }, [onEasterEggTrigger, onLpClick]);

  return (
    <div className="justify-between px-1 w-full h-[8%] border-t-2 flex items-center gap-1 text-xs">
      <div className="flex items-center gap-1">
        {userName === "rosie" &&
                <button
                onClick={onAddAccount}
                disabled={isLoading}
                className="pixel-borders pixel-btn-white-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add Account"
              >
                <span className="text-xs font-bold leading-none">+</span>
              </button>
        }

        {hasAccounts && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing || isLoading}
            className="pixel-borders pixel-btn-white-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh"
          >
            <span
              className={`text-xs font-bold leading-none inline-block ${
                isRefreshing ? "animate-spin" : ""
              }`}
            >
              @
            </span>
          </button>
        )}
      </div>
      {hasAccounts && (
        <div className="flex items-center gap-1">
          <div className="text-border">
            {displayTier}
            {rank ? ` ${rank}` : ""}
          </div>
          {displayLp && (
            <div
              className="pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none"
              onClick={handleRankClick}
            >
              <span>{displayLp}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
