"use client"

interface OppggCardFooterProps {
    tier?: string | null;
    rank?: string | null;
    leaguePoints?: number | null;
    onAddAccount: () => void;
    onRefresh: () => void;
    isRefreshing: boolean;
    hasAccounts: boolean;
}

export default function OppggCardFooter({
    tier,
    rank,
    leaguePoints,
    onAddAccount,
    onRefresh,
    isRefreshing,
    hasAccounts,
}: OppggCardFooterProps) {
    const displayTier = tier || "Unranked";
    const displayLp = leaguePoints !== null && leaguePoints !== undefined ? `${leaguePoints}lp` : "";

    return (
        <div className="justify-between px-1 w-full h-[5%] border-t-2 flex items-center gap-1 text-xs">
            <div className="flex items-center gap-1">
                <button
                    onClick={onAddAccount}
                    className="pixel-borders w-4 h-4 flex items-center justify-center bg-background text-border hover:bg-border hover:text-background transition-colors"
                    title="Add Account"
                >
                    <span className="text-xs font-bold leading-none">+</span>
                </button>
                {hasAccounts && (
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="pixel-borders w-4 h-4 flex items-center justify-center bg-background text-border hover:bg-border hover:text-background transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <span className={`text-xs font-bold leading-none ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
                    </button>
                )}
            </div>
            {hasAccounts && (
                <div className="flex items-center gap-1">
                    <div className="text-border">{displayTier}{rank ? ` ${rank}` : ""}</div>
                    {displayLp && (
                        <div className="px-2 py-1 h-[90%] bg-background pixel-borders text-border flex items-center">
                            <span>{displayLp}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
