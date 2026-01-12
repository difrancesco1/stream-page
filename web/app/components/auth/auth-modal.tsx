"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/app/context/auth-context"
import CardHeader from "../shared/card-header"

interface AuthModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    allowedTabs?: string[]
    initialTab?: string
}

const authTabs = [
    { title: "login " },
    { title: "register " },
]

export default function AuthModal({ 
    open, 
    onOpenChange,
    allowedTabs,
    initialTab
}: AuthModalProps) {
    const { login, register } = useAuth()
    
    // Filter tabs based on allowedTabs prop
    const filteredTabs = allowedTabs 
        ? authTabs.filter(tab => allowedTabs.includes(tab.title))
        : authTabs
    
    // Determine initial tab
    const getInitialTab = () => {
        if (initialTab) {
            const tab = filteredTabs.find(t => t.title === initialTab)
            if (tab) return tab
        }
        return filteredTabs[0]
    }
    
    const [activeTab, setActiveTab] = useState(getInitialTab())
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isLoginMode = activeTab.title === "login "
    const showTabs = filteredTabs.length > 1

    useEffect(() => {
        if (open) {
            setActiveTab(getInitialTab())
            setUsername("")
            setPassword("")
            setConfirmPassword("")
            setError(null)
        }
    }, [open, initialTab])

    const resetForm = () => {
        setUsername("")
        setPassword("")
        setConfirmPassword("")
        setError(null)
    }

    const handleTabSwitch = (tab: { title: string }) => {
        setActiveTab(tab)
        setError(null)
    }
    
    // Reset to initial tab when modal opens
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setActiveTab(getInitialTab())
            resetForm()
        }
        onOpenChange(newOpen)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!username.trim() || !password.trim()) {
            setError("Please fill in all fields")
            return
        }

        if (!isLoginMode && password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 4) {
            setError("Password must be at least 4 characters")
            return
        }

        setIsLoading(true)

        try {
            const result = isLoginMode 
                ? await login(username, password)
                : await register(username, password)

            if (result.success) {
                resetForm()
                onOpenChange(false)
            } else {
                setError(result.error || `${isLoginMode ? "Login" : "Registration"} failed`)
            }
        } catch {
            setError("Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent 
                showCloseButton={false}
                className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border p-0 gap-0 max-w-[13.75rem]!"
            >
                <DialogTitle className="sr-only">
                    {isLoginMode ? "Login" : "Register"}
                </DialogTitle>
                <div className="wrapper min-h-[12.5rem]">
                    <CardHeader
                        title="auth"
                        exitbtn={true}
                        onClose={() => handleOpenChange(false)}
                        showTabs={showTabs}
                        tabs={filteredTabs}
                        activeTab={activeTab}
                        setActiveTab={handleTabSwitch}
                    >
                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-[0.75rem]">
                            {error && (
                                <div className="text-[0.625rem] text-red-400 bg-red-400/10 px-[var(--spacing-md)] py-[var(--spacing-sm)] pixel-borders">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-[var(--spacing-sm)]">
                                <label className="main-text text-[var(--text-btn)]">username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full pixel-borders pixel-input"
                                    placeholder="enter username"
                                    autoComplete="username"
                                />
                            </div>

                            <div className="space-y-[var(--spacing-sm)]">
                                <label className="main-text text-[var(--text-btn)]">password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full pixel-borders pixel-input"
                                    placeholder="enter password"
                                    autoComplete={isLoginMode ? "current-password" : "new-password"}
                                />
                            </div>

                            {!isLoginMode && (
                                <div className="space-y-[var(--spacing-sm)]">
                                    <label className="main-text text-[var(--text-btn)]">confirm password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={isLoading}
                                        className="w-full pixel-borders pixel-input"
                                        placeholder="confirm password"
                                        autoComplete="new-password"
                                    />
                                </div>
                            )}
                            <div className="flex justify-center">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="pixel-borders pixel-btn-border mt-[var(--spacing-md)]"
                                >
                                    {isLoading ? "..." : isLoginMode ? "login" : "register"}
                                </button>
                            </div>
                        </form>
                    </CardHeader>
                </div>
            </DialogContent>
        </Dialog>
    )
}
