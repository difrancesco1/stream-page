"use client"

export default function DuoTrackerFooter() {
    return (
        <div className="px-[var(--spacing-sm)] w-full h-[1.75rem] flex items-center gap-[var(--spacing-sm)]">
            <label className="pixel-borders pixel-input w-full cursor-pointer">
                <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif"
                    className="hidden"
                /> 
            </label>
            <button
                className="pixel-borders pixel-btn-border disabled:opacity-50"
                title="Upload cat image"
            >
            </button>
        </div>
    )
}