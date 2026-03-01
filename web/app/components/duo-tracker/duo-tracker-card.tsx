"use client"

import { useMemo } from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface DuoEntry {
    id: number;
    gamesPlayed: number;
    name: string;
    result: "W" | "L";
}

const DUMMY_DUOS: DuoEntry[] = [
    { id: 1, gamesPlayed: 15, name: "Player1", result: "W" },
    { id: 2, gamesPlayed: 8,  name: "Player2", result: "L" },
    { id: 3, gamesPlayed: 22, name: "Player3", result: "W" },
]

export default function DuoTrackerCard() {
    const sorted = useMemo(
        () => [...DUMMY_DUOS].sort((a, b) => b.gamesPlayed - a.gamesPlayed),
        []
    )

    return (
        <div className="flex-1 overflow-y-auto px-[var(--spacing-sm)] py-[var(--spacing-xs)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sorted.map((duo) => (
                <div key={duo.id} className="flex items-center gap-[var(--spacing-sm)] main-text">
                    <span className="w-6 text-right">{duo.gamesPlayed}</span>
                    <span className="flex-1 truncate">{duo.name}</span>
                    <span className={duo.result === "W" ? "text-green-400" : "text-red-400"}>
                        {duo.result}
                    </span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-help opacity-50 hover:opacity-100">?</span>
                        </TooltipTrigger>
                        <TooltipContent>add text here</TooltipContent>
                    </Tooltip>
                </div>
            ))}
        </div>
    )
}