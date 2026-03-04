"use client"

import { useMemo, useState } from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface DuoEntry {
    id: number;
    gamesPlayed: number;
    name: string;
    result: string;
    note: string;
}

const DUMMY_DUOS: DuoEntry[] = [
    { id: 1, gamesPlayed: 5, name: "curse#NA2", result: "2-3" , note: "thresh player. sus in among us" },
    { id: 2, gamesPlayed: 3,  name: "Summer July Rain#NA0", result: "0-3" , note: "sry." },
    { id: 3, gamesPlayed: 8, name: "lilAnnabelle#NA1", result: "6-2" , note: "gamerelf vlad god" },
    { id: 4, gamesPlayed: 5, name: "spongebob#TVO", result: "3-2" , note: "tyson1" },
    { id: 5, gamesPlayed: 2, name: "Thumper#Frank", result: "1-1" , note: `verma` },
    { id: 6, gamesPlayed: 1, name: "Let Me Adem#MOAK", result: "0-1" , note: "asol power" },
    { id: 7, gamesPlayed: 3, name: "GnawMe#SOLAR", result: "2-1" , note: "sigh" },
    { id: 8, gamesPlayed: 4, name: "greeenpink#NA1", result: "2-2" , note: "fred" },
    { id: 9, gamesPlayed: 2, name: "Esudesu#NA1 ", result: "2-0" , note: "just on my fl" },
    { id: 10, gamesPlayed: 3, name: "Gon#small", result: "2-1" , note: `smol-der` },
    { id: 11, gamesPlayed: 2, name: "QarthO#NA1 ", result: "2-0" , note: `arena player` },
    { id: 12, gamesPlayed: 9, name: "Akito#NA1", result: "6-3" , note: "janna main but doesn't play janna" },
    { id: 13, gamesPlayed: 2, name: "IlIIlIlIIIIIIIll#NA1", result: "2-0" , note: "puppeh fk this guy" },
    { id: 14, gamesPlayed: 3, name: "marcellui#NA1", result: "1-2" , note: "sry marcell" },
    { id: 15, gamesPlayed: 2, name: "rellge#ILMBF", result: "2-0" , note: "loves her bf :3 asks to play then disappears D:" },
    { id: 16, gamesPlayed: 3, name: "Claver#SOMA", result: "2-1" , note: "picky cleric retail wow player #boston" },
    { id: 17, gamesPlayed: 4, name: "TrevorKTran#Wish", result: "4-0" , note: "cait/mf goat" },
    { id: 18, gamesPlayed: 1, name: "Gromp Rider#SEJ", result: "0-1" , note: "experience ruined due to fool#pyke" },
    { id: 19, gamesPlayed: 1, name: "Munke#lol", result: "1-0" , note: "just played 1 the betrayal" },
    { id: 20, gamesPlayed: 2, name: "yearner#wish", result: "0-2" , note: "very nice for a jungler" },
]

export default function DuoTrackerCard() {
    const sorted = useMemo(
        () => [...DUMMY_DUOS].sort((a, b) => b.gamesPlayed - a.gamesPlayed),
        []
    )

    return (
        <div className="flex-1 overflow-y-auto px-[var(--spacing-sm)] py-[var(--spacing-xs)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sorted.map((duo, index) => (
                <div key={duo.id} className="flex items-center gap-[var(--spacing-sm)] main-text">
                    <span className="w-6 opacity-50 text-left px-[var(--spacing-md)]">{index + 1}</span>
                    <span className="flex-1 truncate">{duo.name}</span>
                    <span>
                        {duo.result}
                    </span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="pixel-borders 
                            ${duo.note===`` ? pixel-btn-white-sm-nohover : pixel-btn-white-sm} 
                            cursor-pointer opacity-80"> i n f o - </span>
                        </TooltipTrigger>
                        <TooltipContent
                            style={{ display: duo.note===`` ? 'none' : 'block' }}
                        >
                            {duo.note}
                            </TooltipContent>
                    </Tooltip>
                </div>
            ))}
        </div>
    )
}