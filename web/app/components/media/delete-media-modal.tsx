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
            <DialogContent className="bg-foreground pixel-borders max-w-md">
                <DialogTitle className="main-text text-lg mb-4">
                    Delete Media Item
                </DialogTitle>
                <div className="p-4">
                    <p className="main-text text-sm mb-4">
                        Are you sure you want to delete <strong>"{item.name}"</strong>?
                    </p>
                    <p className="alt-text text-xs mb-4 opacity-70">
                        This action cannot be undone.
                    </p>

                    {error && (
                        <div className="mb-4 p-2 bg-red-900/50 pixel-borders">
                            <p className="main-text text-xs text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => onOpenChange(false)}
                            disabled={isDeleting}
                            className="pixel-btn text-xs"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="pixel-btn text-xs bg-red-900 hover:bg-red-800"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

