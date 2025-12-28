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
        <>
            <div className="absolute bottom-0 px-1 w-full h-[10%] min-h-[28px] border-t-2 flex items-center gap-1">
                <input className="w-28 pixel-borders pixel-input" placeholder="media name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
                <input className="w-48 pixel-borders pixel-input" placeholder="short info"
                value={info}
                onChange={(e) => setInfo(e.target.value)}
            />
                <input className="w-12 pixel-borders pixel-input" placeholder="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
            />
                <button 
                className=" pixel-borders px-1 my-1 text-xs bg-border text-background 
                                        hover:bg-accent hover:text-background"
                onClick={handleAdd}
                disabled={isAdding || !name.trim()}
            >
                {isAdding ? "..." : "+"}
            </button>
            </div>
        </>
    )
}
