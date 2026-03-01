"use client"

import { useMemo } from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface DuoEntry {
    id: number;
    gamesPlayed: number;
    name: string;
    result: string;
}

const DUMMY_DUOS: DuoEntry[] = [
    { id: 1, gamesPlayed: 15, name: "Player1", result: "14-1" },
    { id: 2, gamesPlayed: 8,  name: "Player2", result: "1-7" },
    { id: 3, gamesPlayed: 22, name: "Player3", result: "11-11" },
]

export default function DuoTrackerCard() {
    const sorted = useMemo(
        () => [...DUMMY_DUOS].sort((a, b) => b.gamesPlayed - a.gamesPlayed),
        []
    )

    return (
        <div className="flex-1 overflow-y-auto px-[var(--spacing-sm)] py-[var(--spacing-xs)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sorted.map((duo) => (
                <div key={duo.id} className="flex items-center gap-[var(--spacing-md)] main-text">
                    <span className="w-6 text-right">{duo.gamesPlayed}</span>
                    <span className="flex-1 truncate">{duo.name}</span>
                    <span>
                        {duo.result}
                    </span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="pixel-borders pixel-btn-white-sm cursor-pointer opacity-80"> i n f o - </span>
                        </TooltipTrigger>
                        <TooltipContent>add text here</TooltipContent>
                    </Tooltip>
                </div>
            ))}
        </div>
    )
}