"use client"

import CardHeader from "../shared/card-header";
import { useState, useEffect, useCallback } from "react";
import MediaFooter from "./media-footer"; 
import MediaItem from "./media-item"; 
import { getMediaList, type MediaItem as MediaItemType, type MediaCategory } from "@/app/api/media/actions";
import { useAuth } from "@/app/context/auth-context";

interface MediaContainerProps {
    onClose?: () => void;
    onMouseDown?: () => void;
}

interface Tab {
    title: string;
    category: MediaCategory;
}

const tabs: Tab[] = [
    { title: "movies", category: "movie" },
    { title: "tv shows", category: "tv_show" },
    { title: "kdrama", category: "kdrama" },
    { title: "anime", category: "anime" },
    { title: "youtubers", category: "youtube" },
]

export default function MediaContainer({ onClose, onMouseDown }: MediaContainerProps) {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);
    const [mediaItems, setMediaItems] = useState<MediaItemType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMedia = useCallback(async () => {
        setIsLoading(true);
        const result = await getMediaList(undefined, token ?? undefined);
        if (result.success) {
            setMediaItems(result.media);
        }
        setIsLoading(false);
    }, [token]);

    useEffect(() => {
        fetchMedia();
    }, [fetchMedia]);

    const handleSetActiveTab = useCallback((tab: { title: string }) => {
        const fullTab = tabs.find((t) => t.title === tab.title);
        if (fullTab) {
            setActiveTab(fullTab);
        }
    }, []);

    // Filter media items by the current tab's category
    const filteredMedia = mediaItems.filter(
        (item) => item.category === activeTab.category
    );

    return (
        <div 
            className="relative wrapper pixel-borders pixel-card w-full max-w-[400px] h-auto min-h-[280px] aspect-[5/3] bg-foreground"
            onMouseDown={onMouseDown}
        >
            <CardHeader
                title="movies and more"
                exitbtn={true}
                onClose={onClose}
                showTabs={true}
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={handleSetActiveTab}
            >
                <div className="px-1 py-1 w-full h-full overflow-y-auto max-h-[180px]">
                    {isLoading ? (
                        <div className="relative flex items-center justify-center h-full">
                            <span className="main-text ">
                                <img src="loading.gif"
                                    className="absolute bottom-0 right-0 h-15"
                                    alt="loading magical girl"
                                ></img>
                            </span>
                        </div>
                    ) : filteredMedia.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <span className="main-text text-xs opacity-50">No {activeTab.title} added yet</span>
                        </div>
                    ) : (
                        filteredMedia.map((item) => (
                            <MediaItem
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                info={item.info}
                                url={item.url}
                                upvoteCount={item.upvote_count}
                                upvoted={item.user_has_upvoted}
                                onUpvote={fetchMedia}
                            />
                        ))
                    )}
                </div>
                <MediaFooter 
                    category={activeTab.category} 
                    onMediaAdded={fetchMedia}
                />
            </CardHeader>
        </div>
    )
}
