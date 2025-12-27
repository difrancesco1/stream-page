"use server";

import { API_URL } from "@/lib/api";

export type MediaCategory = "movie" | "tv_show" | "kdrama" | "anime" | "youtube";

export type MediaResult = {
    success: boolean;
    message: string;
    error?: string;
};

export type MediaItem = {
    id: string;
    category: MediaCategory;
    name: string;
    info: string;
    url: string;
    display_order: number;
    upvote_count: number;
    user_has_upvoted: boolean;
};

export type GetMediaListResult = {
    success: boolean;
    media: MediaItem[];
    error?: string;
};

export async function addMedia(
    token: string,
    category: MediaCategory,
    name: string,
    info: string,
    url: string
): Promise<MediaResult> {
    try {
        const response = await fetch(`${API_URL}/media/add`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                category,
                name,
                info,
                url,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to add media",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully added media",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function removeMedia(
    token: string,
    media_id: string
): Promise<MediaResult> {
    try {
        const response = await fetch(`${API_URL}/media/remove`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                media_id,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to remove media",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully removed media",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function editMedia(
    token: string,
    media_id: string,
    updates: {
        category?: MediaCategory;
        name?: string;
        info?: string;
        url?: string;
    }
): Promise<MediaResult> {
    try {
        const response = await fetch(`${API_URL}/media/edit`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                media_id,
                ...updates,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to edit media",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully updated media",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function upvoteMedia(
    token: string,
    media_id: string
): Promise<MediaResult> {
    try {
        const response = await fetch(`${API_URL}/media/upvote`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                media_id,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to upvote media",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully toggled upvote",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function getMediaList(
    category?: MediaCategory
): Promise<GetMediaListResult> {
    try {
        const url = category
            ? `${API_URL}/media/list?category=${category}`
            : `${API_URL}/media/list`;

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
                media: [],
                error: data.detail || data.message || "Failed to fetch media",
            };
        }

        return {
            success: true,
            media: data.media || [],
        };
    } catch (error) {
        return {
            success: false,
            media: [],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function sortMedia(
    token: string,
    media_ids: string[]
): Promise<MediaResult> {
    try {
        const response = await fetch(`${API_URL}/media/sort`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                media_ids,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to sort media",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully sorted media",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

