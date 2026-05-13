"use client"

export default function WaitlistTopbar() {
    return (
        <div className="mx-[var(--spacing-xs)] my-[var(--spacing-xs)] flex flex-col flex-shrink-0">
            <div className="bg-background h-6 pixel-borders border-accent flex items-center justify-between main-text !text-[0.75rem] px-1">
                <h1 className="text-center w-full">Custom Card Updates</h1>
            </div>
        </div>
    )
}