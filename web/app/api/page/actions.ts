"use server";

import { API_URL } from "@/lib/api";

export type ApiResult = {
    success: boolean;
    error?: string;
    message?: string;
};

export async function uploadBackgroundImage(
    token: string,
    file: File
): Promise<ApiResult & { url?: string }> {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/page/background`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.detail || "Failed to upload background image",
            };
        }

        return {
            success: true,
            url: result.message,  // Backend returns URL in message field
            message: "Background uploaded successfully",
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export type PageConfig = {
    owner_id: string;
    background_image: string | null;
};

export async function getPageConfig(): Promise<{
    success: boolean;
    config?: PageConfig;
    error?: string;
}> {
    try {
        const response = await fetch(`${API_URL}/page/config`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.detail || "Failed to fetch page config",
            };
        }

        return {
            success: true,
            config: result,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

