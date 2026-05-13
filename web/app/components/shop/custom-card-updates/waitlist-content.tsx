"use client";

import { useMemo, useState } from "react";

import type { WaitlistEntry } from "@/app/api/shop/order-actions";

import WaitlistCard from "./waitlist-card";
import WaitlistFooter from "./waitlist-footer";
import WaitlistNamesModal from "./waitlist-names-modal";

interface WaitlistContentProps {
  entries: WaitlistEntry[];
}

export default function WaitlistContent({ entries }: WaitlistContentProps) {
  const [namesOpen, setNamesOpen] = useState(false);

  const gallery = useMemo(
    () => entries.filter((e) => !!e.image_url).slice().reverse(),
    [entries],
  );
  const pending = useMemo(
    () => entries.filter((e) => !e.is_complete),
    [entries],
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full">
      <div className="flex-1 min-h-0 overflow-auto py-[var(--spacing-xs)] flex flex-col gap-[var(--spacing-sm)]">
        {gallery.map((entry) => (
          <WaitlistCard
            key={entry.id}
            imageUrl={entry.image_url as string}
            discordHandle={entry.customer_discord_handle}
            orderCreatedAt={entry.order_created_at}
          />
        ))}
      </div>
      <WaitlistFooter onClick={() => setNamesOpen(true)} />
      <WaitlistNamesModal
        open={namesOpen}
        onOpenChange={setNamesOpen}
        entries={pending}
      />
    </div>
  );
}
