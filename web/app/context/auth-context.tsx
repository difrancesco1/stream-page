"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { loginUser, registerUser } from "@/app/api/auth/actions";

const TOKEN_KEY = "ros_auth_token";

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (storedToken) {
            setToken(storedToken);
            try {
                const payload = JSON.parse(atob(storedToken.split(".")[1]));
                setUser({ id: "", username: payload.username });
            } catch {
                localStorage.removeItem(TOKEN_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const result = await loginUser(username, password);

        if (result.success && result.token) {
            setToken(result.token);
            localStorage.setItem(TOKEN_KEY, result.token);

            try {
                const payload = JSON.parse(atob(result.token.split(".")[1]));
                setUser({ id: "", username: payload.username });
            } catch {
                setUser({ id: "", username });
            }

            return { success: true };
        }

        return { success: false, error: result.error };
    }, []);

    const register = useCallback(async (username: string, password: string) => {
        const result = await registerUser(username, password);

        if (result.success && result.user) {
            return login(username, password);
        }

        return { success: false, error: result.error };
    }, [login]);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
    }, []);

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
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

