"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/app/context/auth-context";
import { updateMediaItem, deleteMediaItem, type MediaCategory } from "@/app/api/media/actions";

interface EditMediaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: {
        id: string;
        name: string;
        info: string;
        url: string;
        category: MediaCategory;
    };
    onSuccess: () => void;
}

export default function EditMediaModal({
    open,
    onOpenChange,
    item,
    onSuccess,
}: EditMediaModalProps) {
    const { token } = useAuth();
    const [name, setName] = useState(item.name);
    const [info, setInfo] = useState(item.info);
    const [url, setUrl] = useState(item.url);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpdate = async () => {
        if (!token) return;
        
        setIsLoading(true);
        setError(null);
        
        const result = await updateMediaItem(token, item.id, {
            name: name.trim(),
            info: info.trim(),
            url: url.trim(),
        });
        
        setIsLoading(false);
        
        if (result.success) {
            onSuccess();
            onOpenChange(false);
        } else {
            setError(result.error || "Failed to update media");
        }
    };

    const handleDelete = async () => {
        if (!token) return;
        if (!confirm(`Delete "${item.name}"?`)) return;
        
        setIsLoading(true);
        setError(null);
        
        const result = await deleteMediaItem(token, item.id);
        
        setIsLoading(false);
        
        if (result.success) {
            onSuccess();
            onOpenChange(false);
        } else {
            setError(result.error || "Failed to delete media");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="pixel-borders">
                <DialogTitle className="main-text text-lg justify-center flex pixel-borders bg-background">
                    Edit Media Item
                </DialogTitle>
                <div className="">
                    <div className="mb-1">
                        <label className="main-text text-xs block">Name:</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-1 pixel-borders bg-background main-text text-xs"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="mb-1">
                        <label className="main-text text-xs block">Info:</label>
                        <textarea
                            value={info}
                            onChange={(e) => setInfo(e.target.value)}
                            className="w-full p-1 pixel-borders bg-background main-text text-xs resize-none"
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="mb-1">
                        <label className="main-text text-xs block">URL:</label>
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full p-1 pixel-borders bg-background main-text text-xs"
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="mb-1 p-1 bg-accent/50 pixel-borders">
                            <p className="main-text text-xs text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 justify-center pt-2">
                        <button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="pixel-btn text-xs bg-accent/90 hover:bg-accent/80"
                        >
                            Delete
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={isLoading || !name.trim() || !info.trim()}
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

