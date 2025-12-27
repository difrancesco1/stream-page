"use client"

import Image from "next/image"

// Data Dragon CDN for champion icons
const DDRAGON_VERSION = "14.24.1"
const getChampionIconUrl = (championName: string) => 
    `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championName}.png`

interface OpggGameCardProps {
    championName: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    matchId: string;
    onHide: (matchId: string) => void;
}

export default function OpggGameCard({ 
    championName, 
    win, 
    kills, 
    deaths, 
    assists, 
    matchId, 
    onHide 
}: OpggGameCardProps) {
    const resultText = win ? "victory" : "defeat";
    const textClass = win ? "main-text" : "accent-text";
    const borderClass = win ? "border-blue-400" : "border-accent";

    return (
        <div className="flex w-full h-[20%] pixel-borders my-1 items-center">
            <div 
                className={`relative w-8 h-8 mx-1 rounded-sm overflow-hidden border-2 ${borderClass} flex-shrink-0`}
                title={championName}
            >
                <Image
                    src={getChampionIconUrl(championName)}
                    alt={championName}
                    width={32}
                    height={32}
                    className="object-cover"
                />
            </div>
            <div className="w-full h-full flex flex-col justify-center">
                <span className={`${textClass} text-xs`}>{resultText}</span>
                <hr />
                <span className={`${textClass} text-xs`}>{kills}/{deaths}/{assists}</span>
            </div>
            <button
                onClick={() => onHide(matchId)}
                className="m-1 pixel-borders w-4 h-4 flex items-center justify-center bg-background text-accent hover:bg-accent hover:text-background transition-colors flex-shrink-0"
            >
                <span className="text-xs font-bold leading-none">x</span>
            </button>
        </div>
    )
}
