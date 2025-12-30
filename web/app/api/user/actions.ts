"use server";

import { API_URL } from "@/lib/api";

export type ApiResult = {
    success: boolean;
    error?: string;
    message?: string;
};

export type SocialLink = {
    platform: string;
    url: string;
};

export type PublicProfile = {
    display_name: string | null;
    birthday: string | null;
    profile_picture: string | null;
    biography: string[] | null;
    social_links: SocialLink[] | null;
    featured_image: string | null;
};

export async function getPublicProfile(): Promise<{
    success: boolean;
    profile?: PublicProfile;
    error?: string;
}> {
    try {
        const response = await fetch(`${API_URL}/users/public-profile`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.detail || "Failed to fetch public profile",
            };
        }

        return {
            success: true,
            profile: result,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateProfile(
    token: string,
    data: {
        display_name?: string;
        birthday?: string;
        biography?: string[];
    }
): Promise<ApiResult> {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.detail || "Failed to update profile",
            };
        }

        return {
            success: true,
            message: "Profile updated successfully",
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function uploadProfilePicture(
    token: string,
    file: File
): Promise<ApiResult & { url?: string }> {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/users/profile-picture`, {
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
                error: result.detail || "Failed to upload profile picture",
            };
        }

        return {
            success: true,
            message: result.message,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function uploadFeaturedImage(
    token: string,
    file: File
): Promise<ApiResult & { url?: string }> {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/users/featured-image`, {
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
                error: result.detail || "Failed to upload featured image",
            };
        }

        return {
            success: true,
            url: result.message,  // Backend returns URL in message field
            message: "Featured image uploaded successfully",
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function updateSocialLinks(
    token: string,
    socialLinks: SocialLink[]
): Promise<ApiResult> {
    try {
        const response = await fetch(`${API_URL}/users/social-links`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ social_links: socialLinks }),
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.detail || "Failed to update social links",
            };
        }

        return {
            success: true,
            message: "Social links updated successfully",
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

