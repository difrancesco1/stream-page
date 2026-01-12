"use client"

import { useState } from "react";
import { useAuth } from "@/app/context/auth-context";
import { upvoteMedia } from "@/app/api/media/actions";
import DeleteMediaModal from "./delete-media-modal";

interface MediaItemProps {
    id: string;
    name: string;
    info: string;
    url: string;
    upvoteCount: number;
    upvoted?: boolean;
    contributorUsername?: string | null;
    username?: string | null;
    onUpvote?: () => void;
    onClick?: () => void;
}

export default function MediaItem({ id, name, info, url, upvoteCount, upvoted, contributorUsername, username, onUpvote, onClick }: MediaItemProps) {
    const { token } = useAuth();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    const canEdit = username && (username === contributorUsername || username === "rosie");

    const handleUpvote = async (e: React.MouseEvent) => {
        if (!token) return;
        e.stopPropagation();
        const result = await upvoteMedia(token, id);
        if (result.success && onUpvote) {
            onUpvote();
        }

    };

    const handleDeleteSuccess = () => {
        if (onUpvote) {
            onUpvote();
        }
    };

    return (
        <>
            <div 
                className={`flex w-[calc(100%-0.0625rem)] h-[2.6875rem] pixel-borders mb-[var(--spacing-sm)] ${canEdit && onClick ? 'cursor-pointer hover:bg-accent/20' : ''}`}
                onClick={() => canEdit && onClick?.()}
            >
                <div className="w-full ">
                    <div className="grid-container">
                        <div className="flex items-center justify-start gap-[var(--spacing-sm)] mt-[calc(var(--spacing-sm)*-1)]">
                            <span className="main-text px-[var(--spacing-sm)]">{name}</span>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pixel-borders pixel-btn-white-sm cursor-pointer opacity-80 mt-[var(--spacing-sm)]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span>url</span>
                            </a>
                        </div>
                        <div className="mt-[-0.3125rem]">
                            <div className="relative pixel-borders pixel-btn-white-nohover top-[var(--spacing-sm)]">
                                <span>{upvoteCount}</span>
                                <button onClick={handleUpvote}
                                    disabled={!token}
                                    className="absolute pixel-borders pixel-btn-remove-sm top-[calc(var(--spacing-md)*-1)]">
                                    <span>{upvoted ? "-" : "+"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <hr className="mr-[2.25rem]"></hr>
                    <div className="grid-container mt-[calc(var(--spacing-sm)*-1)] px-[var(--spacing-sm)]">
                        <span className="alt-text">{info.substring(0, 50)}</span>
                        <span className="alt-text m-[var(--spacing-sm)]">- {contributorUsername || "unknown"}</span>
                    </div>
                </div>
            </div>

            <DeleteMediaModal
                open={showDeleteModal}
                onOpenChange={setShowDeleteModal}
                item={{ id, name }}
                onSuccess={handleDeleteSuccess}
            />
        </>
    )
}
