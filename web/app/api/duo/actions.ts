"use server";

import { API_URL } from "@/lib/api";

export type DuoAccountData = {
    id: string;
    summoner_name: string;
};

export type DuoEntryData = {
    id: string;
    name: string;
    wins: number;
    losses: number;
    games_played: number;
    result: string;
    note: string;
    accounts: DuoAccountData[];
    created_at: string;
};

export type TrackedAccountData = {
    game_name: string;
    tag_line: string;
    last_updated: string | null;
    match_count: number;
};

export type DuoListResult = {
    success: boolean;
    entries: DuoEntryData[];
    since: string | null;
    error?: string;
};

export type DuoResult = {
    success: boolean;
    message: string;
    error?: string;
};

export type AccountResult = {
    success: boolean;
    account: TrackedAccountData | null;
    error?: string;
};

export async function fetchDuoEntries(): Promise<DuoListResult> {
    try {
        const response = await fetch(`${API_URL}/duos/list`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                entries: [],
                since: null,
                error: data.detail || data.message || "Failed to fetch duo entries",
            };
        }

        return {
            success: true,
            entries: data.entries || [],
            since: data.since || null,
        };
    } catch (error) {
        return {
            success: false,
            entries: [],
            since: null,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function fetchTrackedAccount(token: string): Promise<AccountResult> {
    try {
        const response = await fetch(`${API_URL}/duos/account`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                account: null,
                error: data.detail || data.message || "Failed to fetch tracked account",
            };
        }

        return { success: true, account: data };
    } catch (error) {
        return {
            success: false,
            account: null,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function setTrackedAccount(
    token: string,
    gameName: string,
    tagLine: string,
): Promise<DuoResult> {
    try {
        const response = await fetch(`${API_URL}/duos/account`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ game_name: gameName, tag_line: tagLine }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to set account",
            };
        }

        return { success: true, message: data.message || "Account set" };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateTrackedAccount(token: string): Promise<DuoResult> {
    try {
        const response = await fetch(`${API_URL}/duos/account/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to update account",
            };
        }

        return { success: true, message: data.message || "Account updated" };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function recordDuo(
    token: string,
    name: string
): Promise<DuoResult> {
    try {
        const response = await fetch(`${API_URL}/duos/record`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to record duo",
            };
        }

        return { success: true, message: data.message || "Recorded duo" };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function deleteDuoEntry(
    token: string,
    entryId: string
): Promise<DuoResult> {
    try {
        const response = await fetch(`${API_URL}/duos/${entryId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to delete entry",
            };
        }

        return { success: true, message: data.message || "Deleted entry" };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateDuoEntry(
    token: string,
    entryId: string,
    data: { name?: string; note?: string }
): Promise<DuoResult> {
    try {
        const response = await fetch(`${API_URL}/duos/${entryId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const resData = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: resData.detail || resData.message || "Failed to update entry",
            };
        }

        return { success: true, message: resData.message || "Updated entry" };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function addDuoAccount(
    token: string,
    entryId: string,
    summonerName: string
): Promise<DuoResult> {
    try {
        const response = await fetch(`${API_URL}/duos/${entryId}/account`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ summoner_name: summonerName }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to add account",
            };
        }

        return { success: true, message: data.message || "Account added" };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function removeDuoAccount(
    token: string,
    entryId: string,
    accountId: string
): Promise<DuoResult> {
    try {
        const response = await fetch(`${API_URL}/duos/${entryId}/account/${accountId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to remove account",
            };
        }

        return { success: true, message: data.message || "Account removed" };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}
