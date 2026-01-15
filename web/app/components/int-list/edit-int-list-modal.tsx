"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/app/context/auth-context";
import { updateIntListEntry, deleteIntListEntry } from "@/app/api/int-list/actions";

interface EditIntListModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: {
        id: string;
        summoner_name: string;
        summoner_tag: string;
        user_reason: string;
    };
    onSuccess: () => void;
}

export default function EditIntListModal({
    open,
    onOpenChange,
    entry,
    onSuccess,
}: EditIntListModalProps) {
    const { token } = useAuth();
    const [reason, setReason] = useState(entry.user_reason);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpdate = async () => {
        if (!token) return;
        
        setIsLoading(true);
        setError(null);
        
        const result = await updateIntListEntry(token, entry.id, reason);
        
        setIsLoading(false);
        
        if (result.success) {
            onSuccess();
            onOpenChange(false);
        } else {
            setError(result.error || "Failed to update entry");
        }
    };

    const handleDelete = async () => {
        if (!token) return;
        if (!confirm(`Delete ${entry.summoner_name}#${entry.summoner_tag} from int list?`)) return;
        
        setIsLoading(true);
        setError(null);
        
        const result = await deleteIntListEntry(token, entry.id);
        
        setIsLoading(false);
        
        if (result.success) {
            onSuccess();
            onOpenChange(false);
        } else {
            setError(result.error || "Failed to delete entry");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-foreground pixel-borders max-w-[28rem]">
                <DialogTitle className="main-text text-[1.125rem] justify-center flex mb-[var(--spacing-sm)] pixel-borders bg-background">
                    Edit Int List Entry
                </DialogTitle>
                <div className="p-[var(--spacing-sm)]">
                    <div className="">
                        <p className="main-text text-[0.875rem] mb-[var(--spacing-sm)]">
                            {entry.summoner_name}#{entry.summoner_tag}
                        </p>
                    </div>

                    <div className="mb-[var(--spacing-sm)]">
                        <label className="main-text text-[var(--text-btn)] block">Reason:</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-[var(--spacing-sm)] pixel-borders bg-background main-text text-[var(--text-btn)] resize-none"
                            rows={1}
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="mb-[var(--spacing-sm)] p-[var(--spacing-md)] bg-accent/50 pixel-borders">
                            <p className="main-text text-[var(--text-btn)] text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-[var(--spacing-md)] justify-center">
                        <button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="pixel-btn text-[var(--text-btn)] bg-accent/50 hover:bg-accent/80"
                        >
                            Delete
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={isLoading || !reason.trim()}
                            className="pixel-btn text-[var(--text-btn)] bg-accent text-foreground"
                        >
                            {isLoading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

