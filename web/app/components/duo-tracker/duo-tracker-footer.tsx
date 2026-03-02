"use client"

import { useState } from "react"

interface DuoTrackerFooterProps {
    isRosie?: boolean;
    onOpenOpgg?: () => void;
}

export default function DuoTrackerFooter({ isRosie, onOpenOpgg }: DuoTrackerFooterProps) {
    const [name, setName] = useState("")
    const [result, setResult] = useState("")

    const handleAdd = () => {
        // TODO: hook up to backend
        console.log("Add duo:", { name, result })
        setName("")
    }

    if (!isRosie) {
        return (
            <div className="px-[var(--spacing-sm)] w-full h-[1.75rem] flex items-center border-t-2 gap-[var(--spacing-sm)]">
                <button
                    className="main-text hover:underline truncate"
                    onClick={onOpenOpgg}
                >
                    add opgg + dm to play
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
                placeholder="name"
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