"use client"

import Image from "next/image"

// Data Dragon CDN for champion icons
const DDRAGON_VERSION = "15.24.1"
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
    summonerName: string;
    rank: string | null;
    leaguePoints: number | null;
}

export default function OpggGameCard({ 
    championName, 
    win, 
    kills, 
    deaths, 
    assists, 
    matchId, 
    onHide,
    summonerName,
    rank,
    leaguePoints,
}: OpggGameCardProps) {
    const resultText = win ? "victory" : "defeat";
    const textClass = win ? "main-text" : "accent-text";
    const borderClass = win ? "border-blue-400" : "border-accent";

    return (
        <div className="flex w-full h-[15%] pixel-borders my-1 items-center overflow-y-hidden">
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
            <div className="w-full h-full flex flex-col justify-center -mt-[5px] overflow-y-hidden">
                <span className="flex justify-between items-center">
                    <div>
                    <span className={`${textClass} !text-[12px]`}>{resultText} </span>
                    <span className={`alt-text`}>{kills}/{deaths}/{assists}</span>
                    </div>
                    
                </span>

                <hr />
                <span className="flex items-center">
                    <div className="alt-text truncate"> 
                        {rank ? (
                            <>
                                {rank.split("")[0]}
                                {rank.split("").slice(-2).join("") == " I" ? "1 " : ""}
                                {rank.split("").slice(-3).join("") == " II" ? "2 " : ""}
                                {rank.split("").slice(-3).join("") == "III" ? "3 " : ""}
                                {rank.split("").slice(-2).join("") == "IV" ? "4 " : ""}
                            </>
                        ) : (
                            "Unranked "
                        )}
                        {leaguePoints ?? 0}lp - {summonerName}
                    </div>
                </span>
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    onHide(matchId);
                }}
                className="pixel-borders pixel-btn-remove-sm mx-1"
            >x
            </button>

        </div>
    )
}
