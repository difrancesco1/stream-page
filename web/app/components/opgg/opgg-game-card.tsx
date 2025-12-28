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
        <div className="flex w-full h-[15%] pixel-borders my-1 items-center">
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
                <span className="flex justify-between items-center">
                    <span className={`${textClass} !text-xs`}>{resultText}</span>
                    <button
                        onClick={() => onHide(matchId)}
                        className="pixel-borders pixel-btn-remove-sm mr-[1px] mb-[2px]"
                    >x
                    </button>
                </span>

                <hr />
                <span className={`alt-text`}>{kills}/{deaths}/{assists}</span>
            </div>

        </div>
    )
}
