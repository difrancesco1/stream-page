"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";

interface WaitlistImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
}

export default function WaitlistImageModal({
  open,
  onOpenChange,
  imageUrl,
}: WaitlistImageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border p-[var(--spacing-sm)] max-w-[90vw] max-h-[90vh] w-auto"
      >
        {imageUrl && (
          <div className="flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Card art preview"
              className="max-w-full max-h-[80vh] object-contain"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
