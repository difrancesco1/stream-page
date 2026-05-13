"use client"

import type { WaitlistEntry } from "@/app/api/shop/order-actions";

import WaitlistTopbar from "./waitlist-topbar"
import WaitlistContent from "./waitlist-content"


interface WaitlistModalProps {
  entries: WaitlistEntry[];
}

export default function WaitlistModal({ entries }: WaitlistModalProps) {
  return (
    <div className="relative shrink-0 min-w-[100px] h-full text-white pixel-borders pixel-card bg-foreground flex flex-col overflow-hidden">
      <WaitlistTopbar />
      <WaitlistContent entries={entries} />
    </div>
  );
}
