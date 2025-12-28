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
        <div className="flex w-full h-[43px] pixel-borders mb-1">
            <div className="w-full">
                <div className="grid-container">
                    <div className="relative h-8px -mt-1">
                        <span className="main-text px-1">{name}</span>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pixel-borders pixel-btn-border-sm cursor-pointer opacity-80">
                            <span>url</span>
                        </a>
                    </div>
                    <div className="-mt-[4.5px]">
                        <button onClick={handleUpvote}
                            disabled={!token}
                            className="pixel-borders pixel-btn-remove-sm">
                            <span>+</span>
                        </button>
                        <button className="pixel-borders pixel-btn-white-nohover">
                            <span>{upvoteCount}</span>
                        </button>
                    </div>
                </div>
                <hr></hr>
                <div className="grid-container -mt-1 px-1">
                    <span className="alt-text">{info.substring(0,50)}</span>
                    <span className="alt-text m-1">- rosie</span>
                </div>
            </div>
        </div>
    )
}
