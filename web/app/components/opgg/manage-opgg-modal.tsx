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
            <DialogContent className="bg-foreground pixel-borders max-w-md max-h-[80vh] overflow-y-auto">
                <DialogTitle className="main-text text-lg">
                    Manage OPGG Accounts
                </DialogTitle>
                
                <div className="space-y-4 p-4">
                    {/* Unhide All Games */}
                    <div className="pixel-borders p-3 bg-background">
                        <h3 className="main-text text-sm mb-2">Unhide Games</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleUnhideAllGames()}
                                disabled={isLoading}
                                className="w-full pixel-btn text-xs"
                            >
                                Unhide All Games (All Accounts)
                            </button>
                            
                            {accounts.length > 0 && (
                                <div className="mt-2">
                                    <label className="main-text text-xs block mb-1">Or unhide for specific account:</label>
                                    <select
                                        value={selectedAccount || ""}
                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                        className="w-full p-1 pixel-borders bg-foreground main-text text-xs mb-2"
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
                                        className="w-full pixel-btn text-xs"
                                    >
                                        Unhide All Games for Selected
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Manage Accounts */}
                    <div className="pixel-borders p-3 bg-background">
                        <h3 className="main-text text-sm mb-2">Manage Accounts</h3>
                        <div className="space-y-2">
                            {accounts.map((account, index) => (
                                <div key={account.id} className="pixel-borders p-2 bg-foreground flex items-center justify-between">
                                    <div className="flex-1">
                                        <span className="main-text text-xs">
                                            {account.game_name}#{account.tag_line}
                                        </span>
                                        {account.tier && (
                                            <span className="alt-text text-xs ml-2">
                                                {account.tier} {account.rank}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleMoveUp(index)}
                                            disabled={isLoading || index === 0}
                                            className="pixel-btn text-xs px-2"
                                            title="Move up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => handleMoveDown(index)}
                                            disabled={isLoading || index === accounts.length - 1}
                                            className="pixel-btn text-xs px-2"
                                            title="Move down"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAccount(account.id)}
                                            disabled={isLoading}
                                            className="pixel-btn text-xs px-2 bg-red-900 hover:bg-red-800"
                                            title="Delete"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {accounts.length === 0 && (
                                <p className="main-text text-xs opacity-50">No accounts added yet</p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-2 bg-red-900/50 pixel-borders">
                            <p className="main-text text-xs text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="pixel-btn text-xs"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

