"use server";

import { API_URL } from "@/lib/api";

export type AuthResult = {
    success: boolean;
    error?: string;
};

export type LoginResult = AuthResult & {
    token?: string;
    refreshToken?: string;
};

export type RefreshResult = AuthResult & {
    token?: string;
    refreshToken?: string;
};

export type RegisterResult = AuthResult & {
    user?: {
        id: string;
        username: string;
    };
};

export async function loginUser(
    username: string,
    password: string
): Promise<LoginResult> {
    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.detail || "Login failed",
            };
        }

        return {
            success: true,
            token: data.access_token,
            refreshToken: data.refresh_token,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function refreshAccessToken(
    refreshToken: string
): Promise<RefreshResult> {
    try {
        const response = await fetch(`${API_URL}/users/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.detail || "Token refresh failed",
            };
        }

        return {
            success: true,
            token: data.access_token,
            refreshToken: data.refresh_token,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

export async function registerUser(
    username: string,
    password: string
): Promise<RegisterResult> {
    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.detail || "Registration failed",
            };
        }

        return {
            success: true,
            user: {
                id: data.id,
                username: data.username,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

