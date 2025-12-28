"use client"
import Image from "next/image"

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

interface MainContainerProps {
    onOpenCard?: (cardId: CardId) => void;
}

export default function MainContainer({ onOpenCard }: MainContainerProps) {
    return (
        <div className="col-span-8 w-full h-full overflow-y-auto flex flex-col relative border-l-2 border-t-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex flex-col flex-start ">
                <div className="flex gap-1 items-center px-1">
                    <span className="main-text">league twitch streamer</span>
                </div>
                <div className="flex gap-1 items-center px-1">
                    <span className="main-text">Software Engineer @ Seattle</span>
                </div>
                <div className="justify-start">
                    <div className="flex py-1 border-t-2 px-1 ">
                        <div className="relative w-full aspect-video ">
                            <Image
                                src="/wide-rose.png"
                                alt="Ziggs"
                                fill
                                className="rounded-sm object-cover"
                            />
                            <a className="absolute alt-text bottom-0 right-0 mx-1" target="_blank" href="https://x.com/fourdee2">@fourdee</a>
                        </div>
                    </div>
                    

                </div>
            </div>
            <footer className=" bottom-0 w-full flex items-center px-2 gap-2 main-text bg-foreground rounded-b py-[3px] border-t-2">
                <button className="pixel-btn text-[12px] hover:animate-pulse" onClick={() => onOpenCard?.("opgg")}>opgg</button>
                <button className="pixel-btn text-[12px] hover:animate-pulse" onClick={() => onOpenCard?.("movies")}>movies</button>
                <button className="pixel-btn text-[12px] hover:animate-pulse" onClick={() => onOpenCard?.("intList")}>intlist</button>
                <button className="pixel-btn text-[12px] hover:animate-pulse" onClick={() => onOpenCard?.("catPictures")}>cat</button>
            </footer>
        </div>
        
    )
}
