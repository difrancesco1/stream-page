"use client"

import { useState, useCallback, useEffect } from "react";
import CardHeader from "../shared/card-header"
import OppggCardFooter from "./opgg-card-footer";
import OpggGameCard from "./opgg-game-card";
import {
    getOpggAccounts,
    addOpggAccount,
    refreshOpggAccounts,
    removeOpggGame,
    type OpggAccount,
    type RecentMatch,
} from "@/app/api/opgg/actions";
import { useAuth } from "@/app/context/auth-context";

interface OpggCardProps {
    onClose?: () => void;
    onMouseDown?: () => void;
}

interface Tab {
    title: string;
    account?: OpggAccount;
}

export default function OpggCard({ onClose, onMouseDown }: OpggCardProps) {
    const { token } = useAuth();
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [accounts, setAccounts] = useState<OpggAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [summonerName, setSummonerName] = useState("");
    const [tagline, setTagline] = useState("");
    const [addError, setAddError] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        const result = await getOpggAccounts();
        if (result.success) {
            setAccounts(result.accounts);
            // Create tabs from accounts
            const accountTabs: Tab[] = result.accounts.map((account) => ({
                title: account.game_name,
                account,
            }));
            setTabs(accountTabs);
            // Set first tab as active if we have accounts
            if (accountTabs.length > 0 && !activeTab) {
                setActiveTab(accountTabs[0]);
            } else if (activeTab) {
                // Try to keep the same tab selected after refresh
                const currentTab = accountTabs.find(t => t.account?.id === activeTab.account?.id);
                if (currentTab) {
                    setActiveTab(currentTab);
                } else if (accountTabs.length > 0) {
                    setActiveTab(accountTabs[0]);
                } else {
                    setActiveTab(null);
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
        if (!token || !summonerName || !tagline) return;
        setAddError(null);
        const result = await addOpggAccount(token, summonerName, tagline);
        if (result.success) {
            setSummonerName("");
            setTagline("");
            setShowAddForm(false);
            await fetchAccounts();
        } else {
            setAddError(result.error || "Failed to add account");
        }
    };

    const handleRemoveGame = async (matchIndex: number) => {
        if (!token || !activeTab?.account) return;
        const result = await removeOpggGame(token, activeTab.account.puuid, matchIndex);
        if (result.success) {
            await fetchAccounts();
        }
    };

    const currentAccount = activeTab?.account;
    const recentMatches: RecentMatch[] = currentAccount?.recent_matches || [];

    return (
        <>
            <div 
                className="relative wrapper pixel-borders pixel-card w-full max-w-[200px] h-auto min-h-[350px] aspect-[5/3] bg-foreground"
                onMouseDown={onMouseDown}
            >
                <CardHeader
                    title="opgg"
                    exitbtn={true}
                    onClose={onClose}
                    showTabs={tabs.length > 0}
                    tabs={tabs}
                    activeTab={activeTab || undefined}
                    setActiveTab={handleSetActiveTab}
                >
                    <div className="px-1 py-1 w-full h-full overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <span className="main-text">Loading...</span>
                            </div>
                        ) : showAddForm ? (
                            <div className="flex justify-center h-full flex-col px-5">
                                <input
                                    type="text"
                                    placeholder="Summoner Name"
                                    value={summonerName}
                                    onChange={(e) => setSummonerName(e.target.value)}
                                    className=" pixel-borders pixel-input"
                                />
                                <input
                                    type="text"
                                    placeholder="Tag (e.g. NA1)"
                                    value={tagline}
                                    onChange={(e) => setTagline(e.target.value)}
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
                                        add
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
                            <div className="flex flex-col items-center justify-center h-full">
                                <span className="main-text text-xs">No accounts added</span>
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="pixel-borders pixel-btn-border my-1"
                                >
                                    + Add Account
                                </button>
                            </div>
                        ) : (
                            recentMatches.map((match, index) => (
                                <OpggGameCard
                                    key={index}
                                    championName={match.champion_name}
                                    win={match.win}
                                    kills={match.kills}
                                    deaths={match.deaths}
                                    assists={match.assists}
                                    matchIndex={index}
                                    onRemove={handleRemoveGame}
                                />
                            ))
                        )}
                    </div>
                    <OppggCardFooter
                        tier={currentAccount?.tier}
                        rank={currentAccount?.rank}
                        leaguePoints={currentAccount?.league_points}
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
