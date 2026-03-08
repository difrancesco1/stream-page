"use server";

import { API_URL } from "@/lib/api";

export type FirstEntryData = {
    id: string;
    name: string;
    first_count: number;
    created_at: string;
};

export type FirstListResult = {
    success: boolean;
    entries: FirstEntryData[];
    since: string | null;
    error?: string;
};

export type FirstResult = {
    success: boolean;
    message: string;
    error?: string;
};

export async function fetchFirstEntries(): Promise<FirstListResult> {
    try {
        const response = await fetch(`${API_URL}/firsts/list`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                entries: [],
                since: null,
                error: data.detail || data.message || "Failed to fetch first entries",
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

export async function recordFirst(
    token: string,
    name: string
): Promise<FirstResult> {
    try {
        const response = await fetch(`${API_URL}/firsts/record`, {
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
                error: data.detail || data.message || "Failed to record first",
            };
        }

        return { success: true, message: data.message || "Recorded first" };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function deleteFirstEntry(
    token: string,
    entryId: string
): Promise<FirstResult> {
    try {
        const response = await fetch(`${API_URL}/firsts/${entryId}`, {
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

export async function updateFirstEntry(
    token: string,
    entryId: string,
    data: { name?: string; first_count?: number }
): Promise<FirstResult> {
    try {
        const response = await fetch(`${API_URL}/firsts/${entryId}`, {
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
