"use client"

export default function MediaItem () {
    return (
        <>
            <div className="flex w-full h-[25%] pixel-borders">
                <div className="w-[15%] h-[85%] mx-1 my-1 bg-border pixel-borders"></div>
                <div className="w-full h-full">
                    <span className="main-text">good will hunting</span>
                    <hr></hr>
                    <span className="main-text">heartwarming. think abt life. happy ending.</span>
                </div>
                <button className="m-1 pixel-borders w-4 h-4 flex items-center justify-center bg-background text-accent hover:bg-accent hover:text-background transition-colors">
                    <span className="text-xs font-bold leading-none">+</span>
                </button>
            </div>
        </>
    )
}