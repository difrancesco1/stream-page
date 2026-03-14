"use client"

import { useMemo } from "react"
import { type FirstEntryData } from "@/app/api/first/actions"

interface FirstTrackerCardProps {
    entries: FirstEntryData[];
    loading: boolean;
    isRosie?: boolean;
    isEditMode?: boolean;
    onDelete?: (entryId: string) => void;
    onUpdate?: (entryId: string, newCount: number) => void;
}

export default function FirstTrackerCard({ entries, loading, isRosie, isEditMode, onDelete, onUpdate }: FirstTrackerCardProps) {
    const sorted = useMemo(

        () => [...entries].sort((a, b) => b.first_count - a.first_count),
        [entries]
    )

    const handleClick = (user: FirstEntryData) => {
        if (!isEditMode || !isRosie || !onUpdate) return
        onUpdate(user.id, user.first_count + 1)
    }

    const handleContextMenu = (e: React.MouseEvent, user: FirstEntryData) => {
        if (!isEditMode || !isRosie || !onUpdate) return
        e.preventDefault()
        onUpdate(user.id, user.first_count - 1)
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="main-text opacity-50">loading...</p>
            </div>
        )
    }

    if (sorted.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="main-text opacity-50">no firsts yet</p>
            </div>
        )
    }

    const canEdit = isRosie && isEditMode

    return (
        <div className="flex-1 overflow-y-auto px-[var(--spacing-sm)] py-[var(--spacing-xs)] mr-[var(--spacing-sm)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sorted.map((user, index) => (
                <div
                    key={user.id}
                    className={`flex items-center gap-[var(--spacing-sm)] main-text group ${canEdit ? "cursor-pointer hover:bg-background/50 select-none" : ""}`}
                    onClick={() => handleClick(user)}
                    onContextMenu={(e) => handleContextMenu(e, user)}
                >
                    <span className="w-6 opacity-50 text-left px-[var(--spacing-md)]">{index + 1}</span>
                    <span className="flex-1 truncate">{user.name}</span>
                    {index === 0 && <span>👑</span>}
                    <span>{user.first_count}</span>
                    {isRosie && !isEditMode && onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(user.id) }}
                            className="opacity-0 group-hover:opacity-100 text-accent cursor-pointer select-none transition-opacity"
                            title="Remove"
                        >
                            x
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
