"use client"

interface WaitlistFooterProps {
    onClick: () => void;
}

export default function WaitlistFooter({ onClick }: WaitlistFooterProps) {
    return (
        <div className="border-t-2 border-border w-full flex justify-center shrink-0">
            <div className="py-1">
                <button
                    type="button"
                    onClick={onClick}
                    className="pixel-borders px-[var(--spacing-sm)] py-[0.1rem] bg-background text-[color:var(--border)] main-text text-[0.75rem] z-20 hover:bg-[color:var(--accent)] hover:text-[color:var(--background)] transition-colors cursor-pointer"
                >
                    WAITLIST
                </button>
            </div>
        </div>
    )
}