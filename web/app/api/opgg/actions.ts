"use server";

import { API_URL } from "@/lib/api";

export type OpggResult = {
    success: boolean;
    message: string;
    error?: string;
};

export type RecentMatch = {
    match_id: string;
    champion_id: number;
    champion_name: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
};

export type OpggAccount = {
    id: string;
    puuid: string;
    display_order: number;
    game_name: string;
    tag_line: string;
    tier: string | null;
    rank: string | null;
    league_points: number | null;
    wins: number | null;
    losses: number | null;
    recent_matches: RecentMatch[];
};

export type GetOpggAccountsResult = {
    success: boolean;
    accounts: OpggAccount[];
    error?: string;
};

export async function addOpggAccount(
    token: string,
    summoner_name: string,
    tagline: string
): Promise<OpggResult> {
    try {
        const response = await fetch(`${API_URL}/opgg/add_account`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                summoner_name,
                tagline,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to add account",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully added account",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function removeOpggAccount(
    token: string,
    account_id: string
): Promise<OpggResult> {
    try {
        const response = await fetch(`${API_URL}/opgg/remove_account`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                account_id,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to remove account",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully removed account",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function sortOpggAccounts(
    token: string,
    account_ids: string[]
): Promise<OpggResult> {
    try {
        const response = await fetch(`${API_URL}/opgg/sort_accounts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                account_ids,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to sort accounts",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully sorted accounts",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function hideOpggGame(
    token: string,
    match_id: string
): Promise<OpggResult> {
    try {
        const response = await fetch(`${API_URL}/opgg/hide_game`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                match_id,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to hide game",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully hidden game",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function getOpggAccounts(): Promise<GetOpggAccountsResult> {
    try {
        const response = await fetch(`${API_URL}/opgg/accounts`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                accounts: [],
                error: data.detail || data.message || "Failed to fetch accounts",
            };
        }

        return {
            success: true,
            accounts: data.accounts || [],
        };
    } catch (error) {
        return {
            success: false,
            accounts: [],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function refreshOpggAccounts(token: string): Promise<OpggResult> {
    try {
        const response = await fetch(`${API_URL}/opgg/refresh`, {
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
                error: data.detail || data.message || "Failed to refresh accounts",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully refreshed accounts",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

