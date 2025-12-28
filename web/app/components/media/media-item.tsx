"use client"

import { useAuth } from "@/app/context/auth-context";
import { upvoteMedia } from "@/app/api/media/actions";

interface MediaItemProps {
    id: string;
    name: string;
    info: string;
    url: string;
    upvoteCount: number;
    upvoted?: boolean;
    onUpvote?: () => void;
}

export default function MediaItem({ id, name, info, url, upvoteCount, upvoted, onUpvote }: MediaItemProps) {
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

            <div className="w-full">
                <div className="grid-container h-[50%]">
                    <div>
                        <span className="main-text">{name}</span>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pixel-borders pixel-btn-border-sm cursor-pointer">
                            <span className="text-[8px] text-background">link</span>
                        </a>
                    </div>
                    

                    <div className="mr-[2px]">

                        <span className="alt-text m-1">- rosie</span>
                        <button
                            onClick={handleUpvote}
                            disabled={!token}
                            className="pixel-borders pixel-btn-remove-sm">
                            <span className="text-[10px] font-bold leading-none">{upvoted ? "-1" : "+1"}</span>
                            <span className="text-[8px] leading-none">{upvoteCount}</span>
                        </button>
                    </div>
                </div>
                <hr></hr>
                <div className="grid-container">
                    <span className="alt-text">{info}</span>
                </div>
            </div>
        </div>
    )
}
