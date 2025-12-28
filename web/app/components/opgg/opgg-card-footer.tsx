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
        <div className="justify-between px-1 w-full h-[8%] border-t-2 flex items-center gap-1 text-xs">
            <div className="flex items-center gap-1">
                <button
                    onClick={onAddAccount}
                    className="pixel-borders pixel-btn-white-sm"
                    title="Add Account"
                >
                    <span className="text-xs font-bold leading-none">+</span>
                </button>
                {hasAccounts && (
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="pixel-borders pixel-btn-white-sm"
                        title="Refresh"
                    >
                        <span className={`text-xs font-bold leading-none ${isRefreshing ? 'animate-spin' : ''}`}>@</span>
                    </button>
                )}
            </div>
            {hasAccounts && (
                <div className="flex items-center gap-1">
                    <div className="text-border">{displayTier}{rank ? ` ${rank}` : ""}</div>
                    {displayLp && (
                        <div className="pixel-borders pixel-btn-white hover:bg-background!">
                            <span>{displayLp}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
