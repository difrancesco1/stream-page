"use client"

import { useState, useCallback, useEffect, useMemo } from "react";
import CardHeader from "../shared/card-header"
import OppggCardFooter from "./opgg-card-footer";
import OpggGameCard from "./opgg-game-card";
import {
    getOpggAccounts,
    addOpggAccount,
    refreshOpggAccounts,
    hideOpggGame,
    type OpggAccount,
    type RecentMatch,
} from "@/app/api/opgg/actions";
import { useAuth } from "@/app/context/auth-context";

// Rank comparison utilities
const TIER_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const RANK_ORDER = ['IV', 'III', 'II', 'I'];

function getRankScore(tier: string | null, rank: string | null, lp: number | null): number {
    if (!tier) return -1;
    const tierIndex = TIER_ORDER.indexOf(tier.toUpperCase());
    if (tierIndex === -1) return -1;
    
    // Master+ tiers don't have rank divisions
    const isMasterPlus = tierIndex >= TIER_ORDER.indexOf('MASTER');
    const rankIndex = isMasterPlus ? 0 : (rank ? RANK_ORDER.indexOf(rank.toUpperCase()) : 0);
    const lpValue = lp ?? 0;
    
    // Score: tier * 1000 + rank * 100 + lp
    return tierIndex * 1000 + rankIndex * 100 + lpValue;
}

function getHighestRankAccount(accounts: OpggAccount[]): OpggAccount | null {
    if (accounts.length === 0) return null;
    
    return accounts.reduce((highest, current) => {
        const highestScore = getRankScore(highest.tier, highest.rank, highest.league_points);
        const currentScore = getRankScore(current.tier, current.rank, current.league_points);
        return currentScore > highestScore ? current : highest;
    }, accounts[0]);
}

interface OpggCardProps {
    onClose?: () => void;
    onMouseDown?: () => void;
}

interface Tab {
    title: string;
    account?: OpggAccount;
    isAllTab?: boolean;
}

export default function OpggCard({ onClose, onMouseDown }: OpggCardProps) {
    const { token } = useAuth();
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [accounts, setAccounts] = useState<OpggAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [riotId, setRiotId] = useState("");
    const [addError, setAddError] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        const result = await getOpggAccounts();
        if (result.success) {
            setAccounts(result.accounts);
            // Create tabs from accounts with "All" tab first
            const accountTabs: Tab[] = result.accounts.map((account, index) => ({
                title: `0${index + 1}`,
                account,
            }));
            
            // Add "All" tab at the beginning if there are accounts
            const allTabs: Tab[] = accountTabs.length > 0 
                ? [{ title: "All", isAllTab: true }, ...accountTabs]
                : accountTabs;
            
            setTabs(allTabs);
            // Set "All" tab as active if we have accounts
            if (allTabs.length > 0 && !activeTab) {
                setActiveTab(allTabs[0]);
            } else if (activeTab) {
                // Try to keep the same tab selected after refresh
                if (activeTab.isAllTab) {
                    setActiveTab(allTabs[0]);
                } else {
                    const currentTab = allTabs.find(t => t.account?.id === activeTab.account?.id);
                    if (currentTab) {
                        setActiveTab(currentTab);
                    } else if (allTabs.length > 0) {
                        setActiveTab(allTabs[0]);
                    } else {
                        setActiveTab(null);
                    }
                }
            }
        }
        setIsLoading(false);
    }, [activeTab]);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleSetActiveTab = useCallback((tab: { title: string }) => {
        const fullTab = tabs.find((t) => t.title === tab.title);
        if (fullTab) {
            setActiveTab(fullTab);
        }
    }, [tabs]);

    const handleRefresh = async () => {
        if (!token || isRefreshing) return;
        setIsRefreshing(true);
        await refreshOpggAccounts(token);
        await fetchAccounts();
        setIsRefreshing(false);
    };

    const handleAddAccount = async () => {
        if (!token || !riotId) return;
        setIsLoading(true);
        const parts = riotId.split("#");
        if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
            setAddError("Please enter in format: Name#TAG");
            return;
        }
        
        const summonerName = parts[0].trim();
        const tagline = parts[1].trim();
        
        setAddError(null);
        const result = await addOpggAccount(token, summonerName, tagline);
        if (result.success) {
            setRiotId("");
            setShowAddForm(false);
            await fetchAccounts();
        } else {
            setAddError(result.error || "Failed to add account");
        }
        setIsLoading(false);
    };

    const handleHideGame = async (matchId: string) => {
        if (!token) return;
        const result = await hideOpggGame(token, matchId);
        if (result.success) {
            await fetchAccounts();
        }
    };

    const isAllTab = activeTab?.isAllTab ?? false;
    const currentAccount = activeTab?.account;
    
    const recentMatches: (RecentMatch & { summonerName: string; rank: string | null; leaguePoints: number | null })[] = useMemo(() => {
        if (isAllTab) {
            const allMatches = accounts.flatMap(account => 
                account.recent_matches.map(match => ({
                    ...match,
                    summonerName: account.game_name,
                    rank: account.tier && account.rank ? `${account.tier} ${account.rank}` : account.tier,
                    leaguePoints: account.league_points ?? null,
                }))
            );
            const sorted = allMatches.sort((a, b) => {
                const aNum = parseInt(a.match_id.split('_')[1] || '0', 10);
                const bNum = parseInt(b.match_id.split('_')[1] || '0', 10);
                return bNum - aNum;
            });
            return sorted.slice(0, 20);
        }
        return (currentAccount?.recent_matches || []).map(match => ({
            ...match,
            summonerName: currentAccount?.game_name || '',
            rank: currentAccount?.tier && currentAccount?.rank ? `${currentAccount.tier} ${currentAccount.rank}` : currentAccount?.tier || null,
            leaguePoints: currentAccount?.league_points ?? null,
        }));
    }, [isAllTab, accounts, currentAccount]);
    
    // Get highest rank account for "All" tab footer
    const highestRankAccount = useMemo(() => {
        if (isAllTab) {
            return getHighestRankAccount(accounts);
        }
        return null;
    }, [isAllTab, accounts]);

    const displayTitle = useMemo(() => {
        if (isAllTab || !currentAccount) {
            return "opgg";
        }
        return currentAccount.game_name;
    }, [isAllTab, currentAccount]);

    return (
        <>
            <div 
                className="relative wrapper pixel-borders pixel-card w-full max-w-[200px] h-auto min-h-[350px] aspect-[5/3] bg-foreground"
                onMouseDown={onMouseDown}
            >
                <CardHeader
                    title={displayTitle}
                    exitbtn={true}
                    onClose={onClose}
                    showTabs={tabs.length > 0}
                    tabs={tabs}
                    activeTab={activeTab || undefined}
                    setActiveTab={handleSetActiveTab}
                >
                    <div className="px-1 py-1 w-full h-full overflow-y-auto">
                        {isLoading ? (
                            <div className="relative flex items-center justify-center h-full">
                                <span className="main-text ">
                                    <img src="loading.gif"
                                        className="absolute bottom-0 right-0 h-10"
                                        alt="loading magical girl"
                                    ></img>
                                </span>
                            </div>
                        ) : showAddForm ? (
                            <div className="flex justify-center h-full flex-col px-5">
                                <input
                                    type="text"
                                    placeholder="Name#TAG"
                                    value={riotId}
                                    onChange={(e) => setRiotId(e.target.value)}
                                    className=" pixel-borders pixel-input"
                                />
                                {addError && (
                                    <span className="text-accent text-xs">{addError}</span>
                                )}
                                <div className="flex justify-center gap-1 py-1">
                                    <button
                                        onClick={handleAddAccount}
                                        className="pixel-borders pixel-btn-border"
                                    >
                                        {isLoading ? "..." : "add"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setAddError(null);
                                        }}
                                        className="pixel-borders pixel-btn-remove"
                                    >
                                        cancel
                                    </button>
                                </div>
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full ">
                                <span className="main-text text-xs">No accounts added</span>
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="pixel-borders pixel-btn-border my-1"
                                >
                                    + Add Account
                                </button>
                            </div>
                        ) : (
                            recentMatches.map((match) => (
                                <OpggGameCard
                                    key={match.match_id}
                                    championName={match.champion_name}
                                    win={match.win}
                                    kills={match.kills}
                                    deaths={match.deaths}
                                    assists={match.assists}
                                    matchId={match.match_id}
                                    onHide={handleHideGame}
                                    summonerName={match.summonerName}
                                    rank={match.rank}
                                    leaguePoints={match.leaguePoints}
                                />
                            ))
                        )}
                    </div>
                    <OppggCardFooter
                        tier={isAllTab ? highestRankAccount?.tier : currentAccount?.tier}
                        rank={isAllTab ? highestRankAccount?.rank : currentAccount?.rank}
                        leaguePoints={isAllTab ? highestRankAccount?.league_points : currentAccount?.league_points}
                        onAddAccount={() => setShowAddForm(true)}
                        onRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                        hasAccounts={accounts.length > 0}
                    />
                </CardHeader>
            </div>
        </>
    )
}
