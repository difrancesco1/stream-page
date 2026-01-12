"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/app/context/auth-context";
import { 
    unhideOpggGame, 
    unhideAllOpggGames, 
    deleteOpggAccount,
    reorderOpggAccounts,
    type OpggAccount 
} from "@/app/api/opgg/actions";

interface ManageOpggModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accounts: OpggAccount[];
    onSuccess: () => void;
}

export default function ManageOpggModal({
    open,
    onOpenChange,
    accounts,
    onSuccess,
}: ManageOpggModalProps) {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

    const handleUnhideAllGames = async (accountId?: string) => {
        if (!token) return;
        
        const accountName = accountId 
            ? accounts.find(a => a.id === accountId)?.game_name 
            : "all accounts";
        
        if (!confirm(`Unhide all games for ${accountName}?`)) return;
        
        setIsLoading(true);
        setError(null);
        
        const result = await unhideAllOpggGames(token, accountId);
        
        setIsLoading(false);
        
        if (result.success) {
            alert(result.message || "Games unhidden successfully!");
            onSuccess(); // Refresh data without closing
        } else {
            setError(result.error || "Failed to unhide games");
        }
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (!token) return;
        
        const account = accounts.find(a => a.id === accountId);
        if (!confirm(`Delete account ${account?.game_name}#${account?.tag_line}?`)) return;
        
        setIsLoading(true);
        setError(null);
        
        const result = await deleteOpggAccount(token, accountId);
        
        setIsLoading(false);
        
        if (result.success) {
            alert(result.message || "Account deleted successfully!");
            onSuccess(); // Refresh data without closing
        } else {
            setError(result.error || "Failed to delete account");
        }
    };

    const handleMoveUp = async (index: number) => {
        if (!token || index === 0) return;
        
        const newOrder = [...accounts];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        
        setIsLoading(true);
        setError(null);
        
        const result = await reorderOpggAccounts(token, newOrder.map(a => a.id));
        
        setIsLoading(false);
        
        if (result.success) {
            onSuccess(); // Refresh data without closing
        } else {
            setError(result.error || "Failed to reorder accounts");
        }
    };

    const handleMoveDown = async (index: number) => {
        if (!token || index === accounts.length - 1) return;
        
        const newOrder = [...accounts];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        
        setIsLoading(true);
        setError(null);
        
        const result = await reorderOpggAccounts(token, newOrder.map(a => a.id));
        
        setIsLoading(false);
        
        if (result.success) {
            onSuccess(); // Refresh data without closing
        } else {
            setError(result.error || "Failed to reorder accounts");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-foreground pixel-borders max-w-[28rem] max-h-[80vh] overflow-y-auto ">
                <DialogTitle className="main-text text-[1.125rem] px-[var(--spacing-sm)] pixel-borders bg-background">
                    Manage OPGG Accounts
                </DialogTitle>
                
                <div className="space-y-[var(--spacing-sm)] p-[var(--spacing-sm)]">
                    {/* Unhide All Games */}
                    <div className="pixel-borders p-[var(--spacing-sm)] bg-background flex">
                        <h3 className="main-text text-[0.875rem] pt-[var(--spacing-sm)]">show all Games</h3>

                        <div className="space-y-[var(--spacing-md)] px-[var(--spacing-md)] pb-[var(--spacing-sm)]">
                            <button
                                onClick={() => handleUnhideAllGames()}
                                disabled={isLoading}
                                className="w-full pixel-btn text-[var(--text-btn)]"
                            >
                                Unhide All Games (All Accounts)
                            </button>
                        </div>
                    </div><div className="pixel-borders px-[var(--spacing-sm)] bg-background">
                        {accounts.length > 0 && (
                            <div className="mt-[var(--spacing-md)] ">
                                <label className="main-text text-[var(--text-btn)] block mb-[var(--spacing-sm)]">show all games on specific account:</label>
                                <select
                                    value={selectedAccount || ""}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    className="w-full p-[var(--spacing-sm)] pixel-borders bg-foreground main-text text-[var(--text-btn)] "
                                    disabled={isLoading}
                                >
                                    <option value="">Select account...</option>
                                    {accounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.game_name}#{account.tag_line}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => selectedAccount && handleUnhideAllGames(selectedAccount)}
                                    disabled={isLoading || !selectedAccount}
                                    className="ml-[5rem] pixel-btn text-[var(--text-btn)] mb-[var(--spacing-md)]"
                                >
                                    Unhide All Games for Selected
                                </button>
                            </div>
                        )}

                    </div>

                    {/* Manage Accounts */}
                    <div className="pixel-borders p-[var(--spacing-sm)] bg-background">
                        <h3 className="main-text text-[0.875rem] mb-[var(--spacing-sm)]">Manage Accounts</h3>
                        <div className="space-y-[var(--spacing-md)]">
                            {accounts.map((account, index) => (
                                <div key={account.id} className="pixel-borders p-[var(--spacing-sm)] bg-foreground flex items-center justify-between">
                                    <div className="flex-1">
                                        <span className="main-text text-[var(--text-btn)]">
                                            {account.game_name}#{account.tag_line}
                                        </span>
                                        {account.tier && (
                                            <span className="alt-text text-[var(--text-btn)] ml-[var(--spacing-sm)]">
                                                {account.tier} {account.rank}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-[var(--spacing-sm)]">
                                        <button
                                            onClick={() => handleMoveUp(index)}
                                            disabled={isLoading || index === 0}
                                            className="pixel-btn text-[var(--text-btn)] px-[var(--spacing-md)]"
                                            title="Move up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => handleMoveDown(index)}
                                            disabled={isLoading || index === accounts.length - 1}
                                            className="pixel-btn text-[var(--text-btn)] px-[var(--spacing-md)]"
                                            title="Move down"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAccount(account.id)}
                                            disabled={isLoading}
                                            className="pixel-btn text-[var(--text-btn)] px-[var(--spacing-md)] bg-accent/90 hover:bg-accent/80"
                                            title="Delete"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {accounts.length === 0 && (
                                <p className="main-text text-[var(--text-btn)] opacity-50">No accounts added yet</p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-[var(--spacing-md)] bg-accent/50 pixel-borders">
                            <p className="main-text text-[var(--text-btn)] text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-[var(--spacing-md)] justify-center">
                        <button
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="pixel-btn text-[var(--text-btn)]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

