"use client"

import { useState } from "react"

interface DuoTrackerFooterProps {
    isRosie?: boolean;
}

export default function DuoTrackerFooter({ isRosie }: DuoTrackerFooterProps) {
    const [name, setName] = useState("")

    const handleAdd = () => {
        // TODO: hook up to backend
        console.log("Add first:", { name })
        setName("")
    };

    if (!isRosie) {
        return (
            <div className="h-[1.75rem] px-[var(--spacing-md)] border-t-2">
                <button
                    className="main-text opacity-70"
                >
                    since 7/8/2023
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