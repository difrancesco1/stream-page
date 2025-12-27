"use client"

import { useAuth } from "@/app/context/auth-context";
import { upvoteMedia } from "@/app/api/media/actions";

interface MediaItemProps {
    id: string;
    name: string;
    info: string;
    url: string;
    upvoteCount: number;
    onUpvote?: () => void;
}

export default function MediaItem({ id, name, info, url, upvoteCount, onUpvote }: MediaItemProps) {
    const { token } = useAuth();

    const handleUpvote = async () => {
        if (!token) return;
        const result = await upvoteMedia(token, id);
        if (result.success && onUpvote) {
            onUpvote();
        }
    };

    return (
        <div className="flex w-full min-h-[50px] pixel-borders mb-1">
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-[15%] min-w-[40px] h-auto mx-1 my-1 bg-border pixel-borders flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
            >
                <span className="text-[8px] text-background">link</span>
            </a>
            <div className="flex-1 py-1 overflow-hidden">
                <span className="main-text text-xs font-bold block truncate">{name}</span>
                <hr className="border-border/50 my-0.5" />
                <span className="main-text text-[10px] block">{info}</span>
            </div>
            <button 
                onClick={handleUpvote}
                disabled={!token}
                className="m-1 pixel-borders w-6 h-6 flex flex-col items-center justify-center bg-background text-accent hover:bg-accent hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={token ? "Upvote" : "Login to upvote"}
            >
                <span className="text-[10px] font-bold leading-none">^</span>
                <span className="text-[8px] leading-none">{upvoteCount}</span>
            </button>
        </div>
    )
}
