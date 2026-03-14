"use client"

import { useMemo, useState } from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { type DuoEntryData } from "@/app/api/duo/actions"

interface DuoTrackerCardProps {
    entries: DuoEntryData[];
    loading: boolean;
    isRosie?: boolean;
    onDelete?: (entryId: string) => void;
    onUpdate?: (entryId: string, data: { name?: string; note?: string }) => void;
    onAddAccount?: (entryId: string, summonerName: string) => void;
    onRemoveAccount?: (entryId: string, accountId: string) => void;
}

export default function DuoTrackerCard({ entries, loading, isRosie, onDelete, onUpdate, onAddAccount, onRemoveAccount }: DuoTrackerCardProps) {
    const [editEntry, setEditEntry] = useState<DuoEntryData | null>(null)
    const [editName, setEditName] = useState("")
    const [editNote, setEditNote] = useState("")
    const [newAccount, setNewAccount] = useState("")

    const sorted = useMemo(
        () => [...entries].sort((a, b) => b.games_played - a.games_played || b.wins - a.wins),
        [entries]
    )

    const openEdit = (entry: DuoEntryData) => {
        if (!isRosie || !onUpdate) return
        const fresh = entries.find(e => e.id === entry.id) ?? entry
        setEditEntry(fresh)
        const hasAlias = fresh.accounts.length > 0 && fresh.name !== fresh.accounts[0].summoner_name
        setEditName(hasAlias ? fresh.name : "")
        setEditNote(fresh.note)
        setNewAccount("")
    }

    const handleSave = () => {
        if (!editEntry || !onUpdate) return
        onUpdate(editEntry.id, {
            name: editName.trim(),
            note: editNote,
        })
        setEditEntry(null)
    }

    const handleAddAccount = () => {
        if (!editEntry || !onAddAccount || !newAccount.trim()) return
        onAddAccount(editEntry.id, newAccount.trim())
        setNewAccount("")
        setEditEntry(null)
    }

    const handleRemoveAccount = (accountId: string) => {
        if (!editEntry || !onRemoveAccount) return
        onRemoveAccount(editEntry.id, accountId)
        setEditEntry(null)
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="main-text opacity-50">loading...</p>
            </div>
        )
    }

    if (sorted.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="main-text opacity-50">no duos yet</p>
            </div>
        )
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto px-[var(--spacing-sm)] py-[var(--spacing-xs)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {sorted.map((duo, index) => (
                    <div
                        key={duo.id}
                        className={`flex items-center gap-[var(--spacing-sm)] main-text group ${isRosie ? "cursor-pointer hover:bg-background/50" : ""}`}
                        onClick={() => openEdit(duo)}
                    >
                        <span className="w-6 opacity-50 text-left px-[var(--spacing-md)]">{index + 1}</span>
                        <span className="flex-1 truncate">{duo.name}</span>
                        <span>{duo.result}</span>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className={`pixel-borders ${duo.note ? "pixel-btn-white-sm" : "pixel-btn-white-sm-nohover"} cursor-pointer opacity-80`}>
                                    i n f o -
                                </span>
                            </TooltipTrigger>
                            <TooltipContent style={{ display: duo.note ? "block" : "none" }}>
                                {duo.note}
                            </TooltipContent>
                        </Tooltip>
                        {isRosie && onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(duo.id) }}
                                className="opacity-0 group-hover:opacity-100 text-accent cursor-pointer select-none transition-opacity"
                                title="Remove"
                            >
                                x
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <Dialog open={!!editEntry} onOpenChange={(open) => { if (!open) setEditEntry(null) }}>
                <DialogContent className="max-w-[15rem] p-3 pixel-borders" showCloseButton={false}>
                    <DialogTitle className="main-text text-sm">edit duo</DialogTitle>
                    <div className="flex flex-col gap-2">
                        <label className="main-text text-xs opacity-70">name</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder={editEntry?.accounts[0]?.summoner_name ?? ""}
                            className="pixel-borders pixel-input w-full"
                        />

                        <label className="main-text text-xs opacity-70">note</label>
                        <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="pixel-borders pixel-input w-full"
                        />

                        <label className="main-text text-xs opacity-70 mt-1">accounts</label>
                        <div className="flex flex-col gap-1">
                            {editEntry?.accounts.map((acc) => (
                                <div key={acc.id} className="flex items-center gap-1 main-text text-xs">
                                    <span className="flex-1 truncate">{acc.summoner_name}</span>
                                    {(editEntry.accounts.length > 1) && (
                                        <button
                                            onClick={() => handleRemoveAccount(acc.id)}
                                            className="text-accent cursor-pointer select-none opacity-70 hover:opacity-100"
                                            title="Remove account"
                                        >
                                            x
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-1">
                            <input
                                type="text"
                                value={newAccount}
                                onChange={(e) => setNewAccount(e.target.value)}
                                placeholder="add account..."
                                className="pixel-borders pixel-input flex-1 text-xs"
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddAccount() }}
                            />
                            <button
                                onClick={handleAddAccount}
                                disabled={!newAccount.trim()}
                                className="pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none main-text text-xs px-2 disabled:opacity-30"
                            >
                                +
                            </button>
                        </div>

                        <div className="flex gap-2 mt-1">
                            <button
                                onClick={() => setEditEntry(null)}
                                className="flex-1 pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none main-text text-xs"
                            >
                                cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 pixel-borders pixel-btn-white hover:bg-background! cursor-pointer select-none main-text text-xs"
                            >
                                save
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
