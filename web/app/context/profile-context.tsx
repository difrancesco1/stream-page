"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import { getPublicProfile, type PublicProfile } from "@/app/api/user/actions";

type ProfileContextType = {
    profile: PublicProfile | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getPublicProfile();
            if (result.success && result.profile) {
                setProfile(result.profile);
            } else {
                setError(result.error || "Failed to fetch profile");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const value: ProfileContextType = {
        profile,
        isLoading,
        error,
        refetch: fetchProfile,
    };

    return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error("useProfile must be used within a ProfileProvider");
    }
    return context;
}

