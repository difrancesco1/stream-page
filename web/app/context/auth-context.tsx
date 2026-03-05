"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type ReactNode,
} from "react";
import { loginUser, registerUser, refreshAccessToken } from "@/app/api/auth/actions";

const ACCESS_TOKEN_KEY = "ros_auth_token";
const REFRESH_TOKEN_KEY = "ros_refresh_token";

const REFRESH_BUFFER_MS = 60 * 1000;

type User = {
    id: string;
    username: string;
} | null;

type AuthContextType = {
    user: User;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    onAuthError: () => Promise<void>;
};

function decodePayload(token: string): Record<string, unknown> | null {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch {
        return null;
    }
}

function getTokenExp(token: string): number | null {
    const payload = decodePayload(token);
    if (payload && typeof payload.exp === "number") {
        return payload.exp * 1000;
    }
    return null;
}

function isTokenExpired(token: string): boolean {
    const exp = getTokenExp(token);
    if (exp === null) return true;
    return Date.now() >= exp;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRefreshingRef = useRef(false);

    const clearTokens = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const storeTokens = useCallback((accessToken: string, refreshToken: string) => {
        setToken(accessToken);
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

        const payload = decodePayload(accessToken);
        if (payload && typeof payload.username === "string") {
            setUser({ id: "", username: payload.username });
        }
    }, []);

    const scheduleRefresh = useCallback((accessToken: string, doRefresh: () => Promise<void>) => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }

        const exp = getTokenExp(accessToken);
        if (exp === null) return;

        const delay = Math.max(exp - Date.now() - REFRESH_BUFFER_MS, 0);
        refreshTimerRef.current = setTimeout(() => {
            doRefresh();
        }, delay);
    }, []);

    const performRefresh = useCallback(async (): Promise<boolean> => {
        if (isRefreshingRef.current) return false;
        isRefreshingRef.current = true;

        try {
            const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (!storedRefresh || isTokenExpired(storedRefresh)) {
                clearTokens();
                return false;
            }

            const result = await refreshAccessToken(storedRefresh);
            if (result.success && result.token && result.refreshToken) {
                storeTokens(result.token, result.refreshToken);
                scheduleRefresh(result.token, performRefresh);
                return true;
            }

            clearTokens();
            return false;
        } finally {
            isRefreshingRef.current = false;
        }
    }, [clearTokens, storeTokens, scheduleRefresh]);

    useEffect(() => {
        async function init() {
            const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
            const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

            if (storedAccess && !isTokenExpired(storedAccess)) {
                const payload = decodePayload(storedAccess);
                if (payload && typeof payload.username === "string") {
                    setToken(storedAccess);
                    setUser({ id: "", username: payload.username });
                    scheduleRefresh(storedAccess, performRefresh);
                }
            } else if (storedRefresh && !isTokenExpired(storedRefresh)) {
                await performRefresh();
            } else {
                localStorage.removeItem(ACCESS_TOKEN_KEY);
                localStorage.removeItem(REFRESH_TOKEN_KEY);
            }

            setIsLoading(false);
        }

        init();

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    const login = useCallback(async (username: string, password: string) => {
        const result = await loginUser(username, password);

        if (result.success && result.token && result.refreshToken) {
            storeTokens(result.token, result.refreshToken);
            scheduleRefresh(result.token, performRefresh);
            return { success: true };
        }

        return { success: false, error: result.error };
    }, [storeTokens, scheduleRefresh, performRefresh]);

    const register = useCallback(async (username: string, password: string) => {
        const result = await registerUser(username, password);
        return { success: true, error: result.error };
    }, []);

    const logout = useCallback(() => {
        clearTokens();
    }, [clearTokens]);

    const onAuthError = useCallback(async () => {
        const success = await performRefresh();
        if (!success) {
            clearTokens();
        }
    }, [performRefresh, clearTokens]);

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !isTokenExpired(token),
        login,
        register,
        logout,
        onAuthError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
