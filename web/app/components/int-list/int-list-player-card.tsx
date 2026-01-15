"use client"

import Image from "next/image"
import type { IntListEntry, RecentMatch } from "@/app/api/int-list/actions"

// Data Dragon CDN for champion icons
const DDRAGON_VERSION = "15.24.1"
const getChampionIconUrl = (championName: string) => 
    `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championName}.png`

// Tier abbreviations
const TIER_ABBREV: Record<string, string> = {
    "IRON": "I",
    "BRONZE": "B",
    "SILVER": "S",
    "GOLD": "G",
    "PLATINUM": "P",
    "EMERALD": "E",
    "DIAMOND": "D",
    "MASTER": "M",
    "GRANDMASTER": "GM",
    "CHALLENGER": "C",
}

// Roman numeral to number
const RANK_NUM: Record<string, string> = {
    "I": "1",
    "II": "2",
    "III": "3",
    "IV": "4",
}

// Format rank string: "DIAMOND IV 25LP" -> "D4 25LP"
function formatRank(rank: string | null): string {
    if (!rank || rank === "UNRANKED") return "X"
    
    const parts = rank.split(" ")
    if (parts.length < 3) return rank
    
    const tier = TIER_ABBREV[parts[0]] || parts[0]
    const division = RANK_NUM[parts[1]] || parts[1]
    const lp = parts[2]
    
    return `${tier}${division} ${lp}`
}

interface ChampionIconProps {
    match: RecentMatch;
}

function ChampionIcon({ match }: ChampionIconProps) {
    return (
        <div 
            className={`relative w-[1rem] h-[1rem] rounded-sm overflow-hidden border-[length:var(--border-width)] ${
                match.win ? 'border-blue-400' : 'border-accent'
            }`}
            title={`${match.champion_name} - ${match.win ? 'Win' : 'Loss'}`}
        >
            <Image
                src={getChampionIconUrl(match.champion_name)}
                alt={match.champion_name}
                width={20}
                height={20}
                className="object-cover"
            />
        </div>
    )
}

interface IntListPlayerCardProps {
    entries: IntListEntry[];
    isLoading: boolean;
    error: string | null;
    onEntryClick?: (entry: IntListEntry) => void;
    showUsername?: boolean;
    username?: string | null;
}

export default function IntListPlayerCard({ entries, isLoading, error, onEntryClick, showUsername, username }: IntListPlayerCardProps) {

    if (isLoading) {
        return (
            <div className="relative flex items-center justify-center h-full">
                <span className="main-text cursor-loading">
                    <img src="loading.gif"
                        className="absolute h-[2.5rem]"
                        alt="loading magical girl"
                    ></img>
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <span className="main-text text-red-400">{error}</span>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <span className="main-text text-border/75">no entries found</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-[var(--spacing-sm)]">
            {entries.map((entry) => {
                const canEdit = username && username === "rosie" || username === entry.contributor_username;
                return (
                <div 
                    key={entry.id} 
                    className={`flex flex-col w-full pixel-borders px-[var(--spacing-sm)] ${canEdit && onEntryClick ? 'cursor-pointer hover:bg-accent/20' : ''}`}
                    onClick={() => canEdit && onEntryClick?.(entry)}
                >
                    {/* Top row: summoner#tag :: champion icons */}
                    <div className="flex justify-between items-center gap-[var(--spacing-sm)] flex-wrap">
                        <span className="main-text text-[var(--text-btn)] font-bold">
                            {entry.summoner_name}#{entry.summoner_tag}
                        </span>
                        <div className="flex gap-[var(--spacing-xs)] flex-wrap">
                            {(entry.recent_matches || []).map((match, index) => (
                                <ChampionIcon key={index} match={match} />
                            ))}
                            {(!entry.recent_matches || entry.recent_matches.length === 0) && (
                                <span className="main-text text-[0.625rem] alt-text">no recent games</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Middle row: separator */}
                    <hr></hr>
                    
                    {/* Bottom row: rank progression :: reason */}
                    <div className="flex justify-between items-center alt-text">
                        <div className="text-[var(--text-accent)] text-spacing">
                            <span>
                                {formatRank(entry.rank_when_added)}
                            </span>
                            <span> ➜ </span>
                            <span>
                                {formatRank(entry.current_rank)}
                            </span>
                        </div>
                        <span className="text-[var(--text-accent)] text-spacing ">

                            {showUsername ? `${entry.contributor_username}: ${entry.user_reason}` : entry.user_reason}
                        </span>
                    </div>
                </div>
            )})}
        </div>
    );
}
