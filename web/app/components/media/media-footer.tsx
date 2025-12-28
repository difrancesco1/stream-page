"use client"

export default function MediaFooter() {
    return (
        <>
            <div className="absolute bottom-0 px-1 w-full h-[10%] border-t-2 flex items-center gap-1">
                <input className="w-28 pixel-borders pixel-input" placeholder="media name" />
                <input className="w-48 pixel-borders pixel-input" placeholder="short info" />
                <input className="w-12 pixel-borders pixel-input" placeholder="url" />
                <button className=" pixel-borders px-1 my-1 text-xs bg-border text-background 
                                        hover:bg-accent hover:text-background">+</button>
            </div>
        </>

    )
}