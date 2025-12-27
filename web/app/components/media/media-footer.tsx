"use client"

import { useState } from "react";
import { useAuth } from "@/app/context/auth-context";
import { addMedia, type MediaCategory } from "@/app/api/media/actions";

interface MediaFooterProps {
    category: MediaCategory;
    onMediaAdded?: () => void;
}

export default function MediaFooter({ category, onMediaAdded }: MediaFooterProps) {
    const { token, user } = useAuth();
    const [name, setName] = useState("");
    const [info, setInfo] = useState("");
    const [url, setUrl] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Only show the add form for rosie
    const isRosie = user?.username === "rosie";

    const handleAdd = async () => {
        if (!token || !name.trim()) return;
        
        setIsAdding(true);
        const result = await addMedia(token, category, name.trim(), info.trim(), url.trim());
        
        if (result.success) {
            setName("");
            setInfo("");
            setUrl("");
            if (onMediaAdded) {
                onMediaAdded();
            }
        }
        setIsAdding(false);
    };

    if (!isRosie) {
        return null;
    }

    return (
        <div className="absolute bottom-0 px-1 w-full h-[10%] min-h-[28px] border-t-2 flex items-center gap-1">
            <input 
                className="px-2 py-[1.1px] text-xs bg-background pixel-borders flex-1 min-w-0 text-border placeholder:text-border/75" 
                placeholder="media name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input 
                className="px-2 py-[1.1px] text-xs bg-background pixel-borders w-24 text-border placeholder:text-border/75" 
                placeholder="short info"
                value={info}
                onChange={(e) => setInfo(e.target.value)}
            />
            <input 
                className="px-2 py-[1.1px] text-xs bg-background pixel-borders w-16 text-border placeholder:text-border/75" 
                placeholder="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
            />
            <button 
                className="pixel-btn-sm disabled:opacity-50"
                onClick={handleAdd}
                disabled={isAdding || !name.trim()}
            >
                {isAdding ? "..." : "+"}
            </button>
        </div>
    )
}
