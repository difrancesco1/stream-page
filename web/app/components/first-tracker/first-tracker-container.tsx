"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/app/context/auth-context"
import { useEditMode } from "@/app/context/edit-mode-context"
import { fetchFirstEntries, recordFirst, deleteFirstEntry, updateFirstEntry, type FirstEntryData } from "@/app/api/first/actions"
import FirstTrackerCard from "./first-tracker-card"
import FirstTrackerFooter from "./first-tracker-footer"
import CardHeader from "../shared/card-header"

interface FirstTrackerContainerProps {
    onClose?: () => void;
    onMouseDown?: () => void;
    isRosie?: boolean;
}

export default function FirstTrackerContainer({ onClose, onMouseDown, isRosie }: FirstTrackerContainerProps) {
    const { token } = useAuth()
    const { isEditMode } = useEditMode()
    const [entries, setEntries] = useState<FirstEntryData[]>([])
    const [since, setSince] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const loadEntries = useCallback(async () => {
        setLoading(true)
        const result = await fetchFirstEntries()
        if (result.success) {
            setEntries(result.entries)
            setSince(result.since)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        loadEntries()
    }, [loadEntries])

    const handleAdd = async (name: string) => {
        if (!token) return
        const result = await recordFirst(token, name)
        if (result.success) {
            await loadEntries()
        }
    }

    const handleDelete = async (entryId: string) => {
        if (!token) return
        const result = await deleteFirstEntry(token, entryId)
        if (result.success) {
            await loadEntries()
        }
    }

    const handleUpdate = async (entryId: string, newCount: number) => {
        if (!token) return
        if (newCount <= 0) {
            await handleDelete(entryId)
            return
        }
        const result = await updateFirstEntry(token, entryId, { first_count: newCount })
        if (result.success) {
            await loadEntries()
        }
    }

    return (
        <div
            className="wrapper pixel-borders pixel-card w-full max-w-[12rem] h-auto min-h-[28rem] aspect-[5/3] bg-foreground"
            onMouseDown={onMouseDown}
        >
            <CardHeader
                title="first in rosie's stream"
                exitbtn={true}
                onClose={onClose}
                showTabs={false}
            >
                <FirstTrackerCard
                    entries={entries}
                    loading={loading}
                    isRosie={isRosie}
                    isEditMode={isEditMode}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                />
                <FirstTrackerFooter
                    isRosie={isRosie}
                    since={since}
                    onAdd={handleAdd}
                />
            </CardHeader>
        </div>
    )
}
