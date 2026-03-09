"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/app/context/auth-context"
import {
    fetchDuoEntries,
    fetchTrackedAccount,
    setTrackedAccount,
    updateTrackedAccount,
    recordDuo,
    deleteDuoEntry,
    updateDuoEntry,
    addDuoAccount,
    removeDuoAccount,
    type DuoEntryData,
    type TrackedAccountData,
} from "@/app/api/duo/actions"
import DuoTrackerCard from "./duo-tracker-card"
import DuoTrackerFooter from "./duo-tracker-footer"
import CardHeader from "../shared/card-header"

interface DuoTrackerContainerProps {
    onClose?: () => void;
    onMouseDown?: () => void;
    isRosie?: boolean;
    onOpenOpgg?: () => void;
}

export default function DuoTrackerContainer({ onClose, onMouseDown, isRosie, onOpenOpgg }: DuoTrackerContainerProps) {
    const { token } = useAuth()
    const [entries, setEntries] = useState<DuoEntryData[]>([])
    const [since, setSince] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [account, setAccount] = useState<TrackedAccountData | null>(null)
    const [accountLoading, setAccountLoading] = useState(false)

    const loadEntries = useCallback(async () => {
        setLoading(true)
        const result = await fetchDuoEntries()
        if (result.success) {
            setEntries(result.entries)
            setSince(result.since)
        }
        setLoading(false)
    }, [])

    const loadAccount = useCallback(async () => {
        if (!token) return
        const result = await fetchTrackedAccount(token)
        if (result.success) {
            setAccount(result.account)
        }
    }, [token])

    useEffect(() => {
        loadEntries()
    }, [loadEntries])

    useEffect(() => {
        if (isRosie && token) {
            loadAccount()
        }
    }, [isRosie, token, loadAccount])

    const handleSetAccount = async (gameName: string, tagLine: string) => {
        if (!token) return
        setAccountLoading(true)
        const result = await setTrackedAccount(token, gameName, tagLine)
        if (result.success) {
            await loadAccount()
            await loadEntries()
        }
        setAccountLoading(false)
    }

    const handleUpdateAccount = async () => {
        if (!token) return
        setAccountLoading(true)
        const result = await updateTrackedAccount(token)
        if (result.success) {
            await loadAccount()
            await loadEntries()
        }
        setAccountLoading(false)
    }

    const handleAdd = async (name: string) => {
        if (!token) return
        const result = await recordDuo(token, name)
        if (result.success) {
            await loadEntries()
        }
    }

    const handleDelete = async (entryId: string) => {
        if (!token) return
        const result = await deleteDuoEntry(token, entryId)
        if (result.success) {
            await loadEntries()
        }
    }

    const handleUpdate = async (entryId: string, data: { name?: string; note?: string }) => {
        if (!token) return
        const result = await updateDuoEntry(token, entryId, data)
        if (result.success) {
            await loadEntries()
        }
    }

    const handleAddAccount = async (entryId: string, summonerName: string) => {
        if (!token) return
        const result = await addDuoAccount(token, entryId, summonerName)
        if (result.success) {
            await loadEntries()
        }
    }

    const handleRemoveAccount = async (entryId: string, accountId: string) => {
        if (!token) return
        const result = await removeDuoAccount(token, entryId, accountId)
        if (result.success) {
            await loadEntries()
        }
    }

    return (
        <div
            className="wrapper pixel-borders pixel-card w-full max-w-[14rem] h-auto min-h-[28rem] aspect-[5/3] bg-foreground"
            onMouseDown={onMouseDown}
        >
            <CardHeader
                title="duo anyone#addme"
                exitbtn={true}
                onClose={onClose}
                showTabs={false}
            >
                <DuoTrackerCard
                    entries={entries}
                    loading={loading}
                    isRosie={isRosie}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                    onAddAccount={handleAddAccount}
                    onRemoveAccount={handleRemoveAccount}
                />
                <DuoTrackerFooter
                    isRosie={isRosie}
                    since={since}
                    account={account}
                    accountLoading={accountLoading}
                    onAdd={handleAdd}
                    onSetAccount={handleSetAccount}
                    onUpdateAccount={handleUpdateAccount}
                    onOpenOpgg={onOpenOpgg}
                />
            </CardHeader>
        </div>
    )
}
