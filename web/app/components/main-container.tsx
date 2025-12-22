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
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/twitch.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-9 h-9 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/twitter.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-9 h-9 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/edit-solid.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-9 h-9 object-contain" unoptimized/>                    
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/tiktok.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-9 h-9 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/youtube.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-9 h-9 object-contain" unoptimized/>
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