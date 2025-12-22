"use client"
import Image from "next/image"
type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

interface MainContainerProps {
    onOpenCard?: (cardId: CardId) => void;
}

export default function MainContainer({ onOpenCard }: MainContainerProps) {
    return (
        <div className="col-span-9 w-full h-full overflow-y-auto flex flex-col gap-2 relative select-none">
            <div className="flex flex-col flex-start px-1 py-1 gap-1 border-b-2">
                <div className="flex gap-1 items-center">
                    <span className="main-text">twitch streamer</span>
                </div>
                <div className="flex gap-1 items-center">
                    <span className="main-text">Software Engineer @ Seattle WA</span>
                </div>
                <div className="flex justify-start gap-1 py-1">
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/twitch.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-5 h-5 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/twitter.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-5 h-5 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/edit-solid.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-5 h-5 object-contain" unoptimized/>                    
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/tiktok.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-5 h-5 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-foreground pixel-borders">
                        <Image src="/icon/youtube.svg" alt="icon" width={0} height={0} sizes="100vw" className="w-5 h-5 object-contain" unoptimized/>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-start mx-1 gap-2 h-full">
                <div className="main-text bg-accent/40 w-fit rounded-sm px-1 pixel-borders bg-accent/60">My work</div>
                <div className="flex gap-2">
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img1.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img2.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img3.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img4.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img5.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                </div>
            </div>
            <footer className="w-full flex items-center justify-center gap-4 main-text border-t-2 bg-foreground rounded-b py-1">
                <button className="pixel-btn" onClick={() => onOpenCard?.("opgg")}>opgg</button>
                <button className="pixel-btn" onClick={() => onOpenCard?.("movies")}>movies</button>
                <button className="pixel-btn" onClick={() => onOpenCard?.("intList")}>int list</button>
                <button className="pixel-btn" onClick={() => onOpenCard?.("catPictures")}>cat pictures</button>
            </footer>
        </div>
        
    )
}