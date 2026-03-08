"use client"

import { useState } from "react"

interface FirstTrackerFooterProps {
    isRosie?: boolean;
    since?: string | null;
    onAdd?: (name: string) => void;
}

export default function FirstTrackerFooter({ isRosie, since, onAdd }: FirstTrackerFooterProps) {
    const [name, setName] = useState("")

    const handleAdd = () => {
        const trimmed = name.trim()
        if (!trimmed || !onAdd) return
        onAdd(trimmed)
        setName("")
    }

    if (!isRosie) {
        return (
            <div className="h-[1.75rem] px-[var(--spacing-md)] border-t-2">
                <button className="main-text opacity-70">
                    {since ? `since ${since}` : "\u00A0"}
                </button>
            </div>
        )
    }

    return (
        <div className="px-[var(--spacing-sm)] w-full h-[1.75rem] flex items-center border-t-2 gap-[var(--spacing-sm)]">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="first user"
                className="pixel-borders pixel-input w-full cursor-pointer"
            />
            <button
                onClick={handleAdd}
                className="pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none"
            >
                +
            </button>
        </div>
    )
}
