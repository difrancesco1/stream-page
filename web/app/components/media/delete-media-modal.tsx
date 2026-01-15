"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/app/context/auth-context";
import { deleteMediaItem } from "@/app/api/media/actions";

interface DeleteMediaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: {
        id: string;
        name: string;
    };
    onSuccess: () => void;
}

export default function DeleteMediaModal({
    open,
    onOpenChange,
    item,
    onSuccess,
}: DeleteMediaModalProps) {
    const { token } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!token) return;
        
        setIsDeleting(true);
        setError(null);
        
        const result = await deleteMediaItem(token, item.id);
        
        setIsDeleting(false);
        
        if (result.success) {
            onSuccess();
            onOpenChange(false);
        } else {
            setError(result.error || "Failed to delete media");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-foreground pixel-borders max-w-[28rem]">
                <DialogTitle className="main-text text-[1.125rem] mb-[var(--spacing-lg)]">
                    Delete Media Item
                </DialogTitle>
                <div className="p-[var(--spacing-lg)]">
                    <p className="main-text text-[0.875rem] mb-[var(--spacing-lg)]">
                        Are you sure you want to delete <strong>"{item.name}"</strong>?
                    </p>
                    <p className="alt-text text-[var(--text-btn)] mb-[var(--spacing-lg)] opacity-70">
                        This action cannot be undone.
                    </p>

                    {error && (
                        <div className="mb-[var(--spacing-lg)] p-[var(--spacing-md)] bg-accent/50 pixel-borders">
                            <p className="main-text text-[var(--text-btn)] text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-[var(--spacing-md)] justify-end">
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="pixel-btn text-[var(--text-btn)] bg-accent/90 hover:bg-accent/80"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

