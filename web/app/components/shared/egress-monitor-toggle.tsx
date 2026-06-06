"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/app/context/auth-context";

const STORAGE_FLAG_KEY = "egress-monitor";
const TOGGLE_EVENT = "egress-monitor-toggle";

function readFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export default function EgressMonitorToggle() {
  const { user, isAuthenticated } = useAuth();
  const isRosie =
    isAuthenticated && user?.username?.toLowerCase() === "rosie";

  // Start undefined to avoid SSR/client hydration mismatch on the label.
  // Once we read localStorage on mount we render the real label.
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    setOn(readFlag());

    const sync = () => setOn(readFlag());
    window.addEventListener(TOGGLE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TOGGLE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!isRosie) return null;

  const handleClick = () => {
    const next = !readFlag();
    try {
      if (next) {
        window.localStorage.setItem(STORAGE_FLAG_KEY, "1");
      } else {
        window.localStorage.removeItem(STORAGE_FLAG_KEY);
      }
    } catch {
      // localStorage may be unavailable (private mode, etc.); fall back to
      // updating in-memory state so the same tab still reflects intent.
    }
    setOn(next);
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
  };

  const isOn = on === true;
  const label = on === null ? "egress" : isOn ? "egress: on" : "egress: off";

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        isOn
          ? "Hide Supabase egress monitor"
          : "Show Supabase egress monitor (rosie only)"
      }
      className={`pixel-btn text-xs flex items-center gap-2 hover:animate-pulse ${
        isOn ? "bg-accent text-foreground" : ""
      }`}
    >
      {label}
    </button>
  );
}
