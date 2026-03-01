"use client"

import { useState } from "react"

interface DuoTrackerFooterProps {
    isRosie?: boolean;
    onOpenOpgg?: () => void;
}

export default function DuoTrackerFooter({ isRosie, onOpenOpgg }: DuoTrackerFooterProps) {
    const [name, setName] = useState("")
    const [result, setResult] = useState<"W" | "L">("W")

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
                className="flex-1 min-w-0 h-5 bg-transparent border border-border px-1 main-text outline-none"
            />
            <select
                value={result}
                onChange={(e) => setResult(e.target.value as "W" | "L")}
                className="h-5 bg-transparent border border-border px-1 main-text outline-none cursor-pointer"
            >
                <option value="W">W</option>
                <option value="L">L</option>
            </select>
            <button
                onClick={handleAdd}
                className="pixel-btn h-5 px-1.5 text-xs leading-none hover:animate-pulse flex-shrink-0"
            >
                +
            </button>
        </div>
    )
}