"use server";

import { API_URL } from "@/lib/api";

export type IntListResult = {
    success: boolean;
    message: string;
    error?: string;
};

export type RecentMatch = {
    champion_id: number;
    champion_name: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
};

export type IntListEntry = {
    id: string;
    summoner_name: string;
    summoner_tag: string;
    user_reason: string;
    contributor_username: string;
    rank_when_added: string | null;
    current_rank: string | null;
    recent_matches: RecentMatch[];
};

export type IntListContributor = {
    user_id: string;
    username: string;
};

export type GetIntListResult = {
    success: boolean;
    entries: IntListEntry[];
    error?: string;
};

export type GetContributorsResult = {
    success: boolean;
    contributors: IntListContributor[];
    error?: string;
};

export async function addIntListEntry(
    token: string,
    summoner_name: string,
    tagline: string,
    user_reason: string
): Promise<IntListResult> {
    try {
        const response = await fetch(`${API_URL}/riot/add_to_int_list`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                summoner_name,
                tagline,
                user_reason,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to add to int list",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully added to int list",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function getIntListEntries(
    contributorId?: string
): Promise<GetIntListResult> {
    try {
        const url = contributorId 
            ? `${API_URL}/riot/int_list?contributor_id=${contributorId}`
            : `${API_URL}/riot/int_list`;
            
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                entries: [],
                error: data.detail || data.message || "Failed to fetch int list",
            };
        }

        return {
            success: true,
            entries: data.entries || [],
        };
    } catch (error) {
        return {
            success: false,
            entries: [],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function getIntListContributors(): Promise<GetContributorsResult> {
    try {
        const response = await fetch(`${API_URL}/riot/int_list/contributors`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                contributors: [],
                error: data.detail || data.message || "Failed to fetch contributors",
            };
        }

        return {
            success: true,
            contributors: data.contributors || [],
        };
    } catch (error) {
        return {
            success: false,
            contributors: [],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateIntListEntry(
    token: string,
    entryId: string,
    userReason: string
): Promise<IntListResult> {
    try {
        const response = await fetch(`${API_URL}/riot/int_list/${entryId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ user_reason: userReason }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to update entry",
            };
        }

        return {
            success: true,
            message: data.message || "Entry updated successfully",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function deleteIntListEntry(
    token: string,
    entryId: string
): Promise<IntListResult> {
    try {
        const response = await fetch(`${API_URL}/riot/int_list/${entryId}`, {
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

        return {
            success: true,
            message: data.message || "Entry deleted successfully",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}