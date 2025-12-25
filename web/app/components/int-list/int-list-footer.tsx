"use client"

export default function IntListFooter () {
    return (
        <>
        <div className="absolute bottom-0 px-1 w-full h-[10%] border-t-2 flex items-center gap-1">
            
            <input className="px-2 py-[1.1px] text-xs 
            bg-background pixel-borders w-30 text-border
            focus:border-accent placeholder:text-border/75" placeholder="ign" />
            <input className="px-2 py-[1.1px] text-xs 
            bg-background pixel-borders text-border
            focus:border-accent placeholder:text-border/75" placeholder="reason" />
            <button className="pixel-btn-sm">+</button>
        </div>
        </>
    )
}