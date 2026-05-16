"use client";

import { useMemo, useState } from "react";

import type { WaitlistEntry } from "@/app/api/shop/order-actions";

import WaitlistCard from "./waitlist-card";
import WaitlistFooter from "./waitlist-footer";
import WaitlistImageModal from "./waitlist-image-modal";
import WaitlistNamesModal from "./waitlist-names-modal";

interface WaitlistContentProps {
  entries: WaitlistEntry[];
}

export default function WaitlistContent({ entries }: WaitlistContentProps) {
  const [namesOpen, setNamesOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const gallery = useMemo(
    () =>
      entries
        .filter((e) => !!e.image_url)
        .slice()
        .sort((a, b) => {
          const ta = new Date(a.completed_at ?? a.order_created_at).getTime();
          const tb = new Date(b.completed_at ?? b.order_created_at).getTime();
          return tb - ta;
        }),
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
            onClick={() => setPreviewUrl(entry.image_url as string)}
          />
        ))}
      </div>
      <WaitlistFooter onClick={() => setNamesOpen(true)} />
      <WaitlistNamesModal
        open={namesOpen}
        onOpenChange={setNamesOpen}
        entries={pending}
      />
      <WaitlistImageModal
        open={!!previewUrl}
        onOpenChange={(o) => {
          if (!o) setPreviewUrl(null);
        }}
        imageUrl={previewUrl}
      />
    </div>
  );
}
