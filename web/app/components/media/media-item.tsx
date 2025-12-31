"use client"

import { useState } from "react";
import { useAuth } from "@/app/context/auth-context";
import { useEditMode } from "@/app/context/edit-mode-context";
import { upvoteMedia } from "@/app/api/media/actions";
import DeleteMediaModal from "./delete-media-modal";

interface MediaItemProps {
    id: string;
    name: string;
    info: string;
    url: string;
    upvoteCount: number;
    upvoted?: boolean;
    onUpvote?: () => void;
    onClick?: () => void;
}

export default function MediaItem({ id, name, info, url, upvoteCount, upvoted, onUpvote, onClick }: MediaItemProps) {
    const { token } = useAuth();
    const { isEditMode } = useEditMode();
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleUpvote = async () => {
        if (!token) return;
        const result = await upvoteMedia(token, id);
        if (result.success && onUpvote) {
            onUpvote();
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteModal(true);
    };

    const handleDeleteSuccess = () => {
        if (onUpvote) {
            onUpvote();  // Refresh the list
        }
    };

    return (
        <>
            <div 
                className={`flex w-full h-[43px] pixel-borders mb-1 ${onClick ? 'cursor-pointer hover:bg-accent/20' : ''}`}
                onClick={onClick}
            >
                <div className="w-full">
                    <div className="grid-container">
                        <div className="relative h-8px -mt-1">
                            <span className="main-text px-1">{name}</span>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-[33%] pixel-borders pixel-btn-white-sm cursor-pointer opacity-80"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span>url</span>
                            </a>
                        </div>
                        <div className="-mt-[5px]">
                            <button className="relative pixel-borders pixel-btn-white-nohover top-1">
                                <span>{upvoteCount}</span>
                            </button>
                            {isEditMode ? (
                                <button 
                                    onClick={handleDeleteClick}
                                    className="absolute pixel-borders pixel-btn-remove-sm right-0 bg-red-900 hover:bg-red-800"
                                >
                                    <span>×</span>
                                </button>
                            ) : (
                                <button onClick={handleUpvote}
                                    disabled={!token}
                                    className="absolute pixel-borders pixel-btn-remove-sm right-0">
                                    <span>{upvoted ? "-" : "+"}</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <hr className="mr-9"></hr>
                    <div className="grid-container -mt-1 px-1">
                        <span className="alt-text">{info.substring(0,50)}</span>
                        <span className="alt-text m-1">- rosie</span>
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
