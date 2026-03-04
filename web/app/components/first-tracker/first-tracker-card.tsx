"use client"

import { useMemo } from "react"


interface FirstEntry {
    id: number;
    name: string;
    firstCount: number;
}

const DUMMY_FIRST: FirstEntry[] = [
    { id: 1, firstCount: 44, name: "TrevorKTran" },
    { id: 2, firstCount: 40, name: "The_Beastly_D" },
    { id: 3, firstCount: 32, name: "swordex123" },
    { id: 4, firstCount: 31, name: "Lokimjolnir" },
    { id: 5, firstCount: 29, name: "Skilliams_TV" },
    { id: 6, firstCount: 24, name: "parathaxx" },
    { id: 7, firstCount: 19, name: "SputNikPlop" },
    { id: 8, firstCount: 16, name: "PathToDeath" },
    { id: 9, firstCount: 16, name: "sigyetaeyeob" },
    { id: 10, firstCount: 14, name: "liukunmj23" },
    { id: 11, firstCount: 12, name: "andyboylol" },
    { id: 12, firstCount: 12, name: "Natook" },
    { id: 13, firstCount: 11, name: "XgameJ" },
    { id: 14, firstCount: 10, name: "spyder199" },
    { id: 15, firstCount: 10, name: "Foodcloud" },
    { id: 16, firstCount: 9, name: "Frozenfruit13" },
    { id: 17, firstCount: 9, name: "Romeoxt" },
    { id: 18, firstCount: 8, name: "Syrain" },
    { id: 19, firstCount: 8, name: "AinAndDine" },
    { id: 20, firstCount: 7, name: "bS000" },
    { id: 21, firstCount: 4, name: "TurtleOnCrack" },
    { id: 22, firstCount: 4, name: "subuwuWRX" },
    { id: 23, firstCount: 4, name: "Diepsigh" },
    { id: 24, firstCount: 3, name: "crescent_rxse" },
    { id: 25, firstCount: 3, name: "iamjavi" },
    { id: 26, firstCount: 3, name: "saucysaucetony" },
    { id: 27, firstCount: 3, name: "markelause" },
    { id: 28, firstCount: 3, name: "mel_4d" },
    { id: 29, firstCount: 2, name: "anarchythesinner" },
    { id: 30, firstCount: 2, name: "Kohaku_Ryu" },
    { id: 31, firstCount: 2, name: "KP_McGee" },
    { id: 32, firstCount: 2, name: "princet8c" },
    { id: 33, firstCount: 2, name: "DigitalLaw" },
    { id: 34, firstCount: 1, name: "Halofan642" },
    { id: 35, firstCount: 1, name: "S2TibersS2" },
    { id: 36, firstCount: 1, name: "sivicx" },
    { id: 37, firstCount: 1, name: "avespring" },
    { id: 38, firstCount: 1, name: "ZeroXInfinity44" },
    { id: 39, firstCount: 1, name: "blubbieboi" },
    { id: 40, firstCount: 1, name: "getreckt16" },
    { id: 41, firstCount: 1, name: "TokidokiCosplay" },
    { id: 42, firstCount: 1, name: "Basstastic" },
    { id: 43, firstCount: 1, name: "fabri_sosa_" },
    { id: 44, firstCount: 1, name: "bobadrinks" },
    { id: 45, firstCount: 1, name: "ArkadyBogdanov" },
    { id: 46, firstCount: 1, name: "WrenStokely" },
    { id: 47, firstCount: 1, name: "Basstastic" },
    { id: 48, firstCount: 1, name: "samshiney" },
    { id: 49, firstCount: 1, name: "lol_gutex" },
    { id: 50, firstCount: 1, name: "ItsSamanthics" },
    { id: 51, firstCount: 1, name: "Molequles" },
    { id: 52, firstCount: 1, name: "GnawMe" },
]

export default function DuoTrackerCard() {
    const sorted = useMemo(
        () => [...DUMMY_FIRST].sort((a, b) => b.firstCount - a.firstCount),
        []
    )

    return (
        <div className="flex-1 overflow-y-auto px-[var(--spacing-sm)] py-[var(--spacing-xs)] mr-[var(--spacing-sm)]  [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sorted.map((user, index) => (
                <div key={user.id} className="flex items-center gap-[var(--spacing-sm)] main-text">
                    <span className="w-6 opacity-50 text-left px-[var(--spacing-md)]">{index + 1}</span>
                    <span className="flex-1">{user.name}</span>
                    <span>{index===0 && <p>👑</p>}</span>
                    <span>
                        {user.firstCount}
                    </span>
                </div>
            ))}
        </div>
    )
}