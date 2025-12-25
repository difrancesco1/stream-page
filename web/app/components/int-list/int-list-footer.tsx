"use client"

export default function IntListFooter () {
    return (
        <>
        <div className="absolute bottom-0 px-1 w-full h-[10%] border-t-2 flex items-center gap-1">
            <button className="pixel-btn-sm">+</button>
            <input className="flex-1 px-2 py-[1.1px] text-xs 
            bg-background border pixel-borders
            focus:border-accent placeholder:text-border/60" placeholder="Add player..." />
        </div>
        </>
    )
}