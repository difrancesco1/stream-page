"use server";

import { API_URL } from "@/lib/api";

export type CatResult = {
    success: boolean;
    message: string;
    error?: string;
};

export type CatImage = {
    id: string;
    image_url: string;
    contributor_username: string;
    created_at: string;
};

export type GetCatImagesResult = {
    success: boolean;
    cats: CatImage[];
    error?: string;
};

export async function uploadCatImage(
    token: string,
    formData: FormData
): Promise<CatResult> {
    try {
        const response = await fetch(`${API_URL}/cats/add`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to upload image",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully uploaded cat image",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function deleteCatImage(
    token: string,
    catId: string
): Promise<CatResult> {
    try {
        const response = await fetch(`${API_URL}/cats/remove`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                cat_id: catId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: "",
                error: data.detail || data.message || "Failed to delete image",
            };
        }

        return {
            success: true,
            message: data.message || "Successfully deleted cat image",
        };
    } catch (error) {
        return {
            success: false,
            message: "",
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function fetchCatImages(): Promise<GetCatImagesResult> {
    try {
        const response = await fetch(`${API_URL}/cats/list`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                cats: [],
                error: data.detail || data.message || "Failed to fetch cat images",
            };
        }

        return {
            success: true,
            cats: data.cats || [],
        };
    } catch (error) {
        return {
            success: false,
            cats: [],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

