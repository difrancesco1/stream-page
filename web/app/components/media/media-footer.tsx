"use client"

export default function MediaFooter() {
    return (
        <>
            <div className="absolute bottom-0 px-1 w-full h-[10%] border-t-2 flex items-center gap-1">
                <input className="px-2 py-[1.1px] text-xs 
            bg-background pixel-borders w-50 text-border placeholder:text-border/75" placeholder="media name" />
                <input className="px-2 py-[1.1px] text-xs 
            bg-background pixel-borders text-border w-28 placeholder:text-border/75" placeholder="short info" />
                <input className="px-2 py-[1.1px] text-xs 
            bg-background pixel-borders text-border w-11 placeholder:text-border/75" placeholder="url" />
                <button className="pixel-btn-sm">+</button>
            </div>
        </>
    )
}