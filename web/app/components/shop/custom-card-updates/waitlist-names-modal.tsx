"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CardHeader from "@/app/components/shared/card-header";
import { useAuth } from "@/app/context/auth-context";
import { updateCustomization } from "@/app/api/shop/order-actions";

import type { WaitlistEntry } from "@/app/api/shop/order-actions";

const DEFAULT_NOTES = "₊✩‧₊ In progress ₊✩‧₊";

interface WaitlistNamesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entries: WaitlistEntry[];
}

export default function WaitlistNamesModal({
    open,
    onOpenChange,
    entries,
}: WaitlistNamesModalProps) {
    const { user, token } = useAuth();
    const isAdmin = user?.username?.toLowerCase() === "rosie";

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
    const inputRef = useRef<HTMLInputElement>(null);

    const notesMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const entry of entries) {
            map[entry.id] = localNotes[entry.id] ?? entry.notes ?? "";
        }
        return map;
    }, [entries, localNotes]);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    function handleNotesClick(entry: WaitlistEntry) {
        if (!isAdmin) return;
        setEditingId(entry.id);
        setEditValue(notesMap[entry.id] ?? "");
    }

    async function handleSave(entryId: string) {
        if (!token) return;
        const trimmed = editValue.trim();
        setLocalNotes((prev) => ({ ...prev, [entryId]: trimmed }));
        setEditingId(null);
        await updateCustomization(token, entryId, { notes: trimmed });
    }

    function handleKeyDown(e: React.KeyboardEvent, entryId: string) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSave(entryId);
        } else if (e.key === "Escape") {
            setEditingId(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border max-h-[80vh] overflow-y-auto p-0 max-w-[20rem]"
            >
                <DialogTitle className="sr-only">waitlist</DialogTitle>
                <CardHeader
                    title="waitlist"
                    exitbtn={true}
                    onClose={() => onOpenChange(false)}
                >

                    <div className="p-[var(--spacing-md)] pt-0">
                        {entries.length === 0 ? (
                            <p className="main-text text-[0.75rem] opacity-70">
                                No one on the waitlist.
                            </p>
                        ) : (
                            <ol className="flex flex-col gap-[0.25rem]">
                                {entries.map((entry, idx) => (
                                    <li
                                        key={entry.id}
                                        className="flex items-center justify-between gap-[var(--spacing-lg)] main-text text-[0.875rem]"
                                    >
                                        <span className="flex min-w-0 items-baseline gap-[var(--spacing-xs)]">
                                            <span className="opacity-50 shrink-0 text-[0.75rem]">
                                                {idx + 1}.
                                            </span>
                                            <span className="truncate">
                                                {entry.customer_discord_handle}
                                            </span>
                                        </span>
                                        {editingId === entry.id ? (
                                            <span className="flex items-center gap-[var(--spacing-xs)] shrink-0">
                                                <input
                                                    ref={inputRef}
                                                    className="main-text text-[0.75rem] bg-transparent pixel-borders outline-none max-w-[7rem] text-right px-[var(--spacing-xs)]"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, entry.id)}
                                                />
                                                <button
                                                    type="button"
                                                    className="main-text text-[0.65rem] pixel-borders px-[var(--spacing-xs)] py-[1px] hover:opacity-100 pixel-btn-border"
                                                    onClick={() => handleSave(entry.id)}
                                                >
                                                    save
                                                </button>
                                            </span>
                                        ) : (
                                            <span
                                                className={`opacity-60 text-[0.75rem] shrink-0 ${isAdmin ? "cursor-pointer hover:opacity-100" : ""}`}
                                                onClick={() => handleNotesClick(entry)}
                                            >
                                                {notesMap[entry.id] || DEFAULT_NOTES}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </CardHeader>
            </DialogContent>
        </Dialog>
    );
}
