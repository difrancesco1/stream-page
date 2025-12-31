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
            <DialogContent className="bg-foreground pixel-borders max-w-md">
                <DialogTitle className="main-text text-lg mb-4">
                    Edit Int List Entry
                </DialogTitle>
                <div className="p-4">
                    <div className="mb-4">
                        <p className="main-text text-sm mb-2">
                            {entry.summoner_name}#{entry.summoner_tag}
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="main-text text-xs block mb-2">Reason:</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2 pixel-borders bg-background main-text text-xs resize-none"
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-2 bg-red-900/50 pixel-borders">
                            <p className="main-text text-xs text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="pixel-btn text-xs bg-red-900 hover:bg-red-800"
                        >
                            Delete
                        </button>
                        <button
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="pixel-btn text-xs"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={isLoading || !reason.trim()}
                            className="pixel-btn text-xs bg-accent text-foreground"
                        >
                            {isLoading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

