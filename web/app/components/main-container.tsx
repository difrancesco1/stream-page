"use client"
import Image from "next/image"

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

interface MainContainerProps {
    onOpenCard?: (cardId: CardId) => void;
}

export default function MainContainer({ onOpenCard }: MainContainerProps) {
    return (
        <div className="col-span-8 w-full h-full overflow-y-auto flex flex-col relative select-none border-l-2 border-t-2">
            <div className="flex flex-col flex-start px-1">
                <div className="flex gap-1 items-center">
                    <span className="main-text">league twitch streamer</span>
                </div>
                <div className="flex gap-1 items-center">
                    <span className="main-text">Software Engineer @ Seattle</span>
                </div>
                <div className="flex justify-start gap-1 py-1">
                    <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-10 h-10">
                        <i className="hn hn-twitch text-2xl text-border" />
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-10 h-10">
                        <i className="hn hn-twitter text-2xl text-border" />
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-10 h-10">
                        <i className="hn hn-edit text-2xl text-border" />
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-10 h-10">
                        <i className="hn hn-tiktok text-2xl text-border" />
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-10 h-10">
                        <i className="hn hn-youtube text-2xl text-border" />
                    </div>
                </div>
            </div>
            <footer className="w-full flex items-center px-1 gap-1 main-text bg-foreground rounded-b py-1 border-t-2">
                <button className="pixel-btn text-[12px]" onClick={() => onOpenCard?.("opgg")}>opgg</button>
                <button className="pixel-btn text-[12px]" onClick={() => onOpenCard?.("movies")}>movies</button>
                <button className="pixel-btn text-[12px]" onClick={() => onOpenCard?.("intList")}>intlist</button>
                <button className="pixel-btn text-[12px]" onClick={() => onOpenCard?.("catPictures")}>cat pics</button>
            </footer>
        </div>
        
    )
}