"use client"

export default function OpggGameCard() {
    return (
        <>
            <div className="flex w-full h-[20%] pixel-borders">
                <div className="w-[35%] h-[85%] mx-1 my-1 bg-border pixel-borders"></div>
                <div className="w-full h-full">
                    <span className="main-text">victory</span>
                    <hr></hr>
                    <span className="main-text">0/1/18</span>
                </div>
                <button className="m-1 pixel-borders w-4 h-4 flex items-center justify-center bg-background text-accent hover:bg-accent hover:text-background transition-colors">
                    <span className="text-xs font-bold leading-none">v</span>
                </button>
            </div>
            <div className="flex w-full h-[20%] pixel-borders my-1">
                <div className="w-[35%] h-[85%] mx-1 my-1 bg-accent pixel-borders"></div>
                <div className="w-full h-full">
                    <span className="accent-text">defeat</span>
                    <hr></hr>
                    <span className="accent-text">0/1/18</span>
                </div>
                <button className="m-1 pixel-borders w-4 h-4 flex items-center justify-center bg-background text-accent hover:bg-accent hover:text-background transition-colors">
                    <span className="text-xs font-bold leading-none">v</span>
                </button>
            </div>
            <div className="flex w-full h-[20%] pixel-borders my-1">
                <div className="w-[35%] h-[85%] mx-1 my-1 bg-border pixel-borders"></div>
                <div className="w-full h-full">
                    <span className="main-text">victory</span>
                    <hr></hr>
                    <span className="main-text">0/1/18</span>
                </div>
                <button className="m-1 pixel-borders w-4 h-4 flex items-center justify-center bg-background text-accent hover:bg-accent hover:text-background transition-colors">
                    <span className="text-xs font-bold leading-none">v</span>
                </button>
            </div>
        </>
    )
}