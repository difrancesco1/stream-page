"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import { useAuth } from "@/app/context/auth-context";

type EditModeContextType = {
    isEditMode: boolean;
    toggleEditMode: () => void;
    canEdit: boolean;  // Whether the current user can edit
};

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Only allow edit mode if user is "rosie"
    const canEdit = user?.username?.toLowerCase() === "rosie";
    
    const toggleEditMode = useCallback(() => {
        if (canEdit) {
            setIsEditMode(prev => !prev);
        }
    }, [canEdit]);
    
    const value: EditModeContextType = {
        isEditMode: isEditMode && canEdit,  // Ensure edit mode is only active if user can edit
        toggleEditMode,
        canEdit,
    };
    
    return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode() {
    const context = useContext(EditModeContext);
    if (context === undefined) {
        throw new Error("useEditMode must be used within an EditModeProvider");
    }
    return context;
}

