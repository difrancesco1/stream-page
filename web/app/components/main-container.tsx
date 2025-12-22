"use client"
import Image from "next/image"

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

interface MainContainerProps {
    onOpenCard?: (cardId: CardId) => void;
}

export default function MainContainer({ onOpenCard }: MainContainerProps) {
    return (
        <div className="col-span-8 w-full h-full overflow-y-auto flex flex-col relative select-none border-l-2 border-t-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                        </div>
                    </div>
                    
                    <div className="flex gap-2 px-2 pb-1">
                        <a href="https://www.twitch.tv/rosie" target="_blank" rel="noopener noreferrer">
                            <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-9 h-9">
                                <i className="hn hn-twitch text-3xl text-border/80 hover:text-accent" />
                            </div>
                        </a>
                        <a href="https://x.com/ttvrosie" target="_blank" rel="noopener noreferrer">
                            <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-9 h-9">
                                <i className="hn hn-twitter text-3xl text-border/80 hover:text-accent" />
                            </div>
                        </a>
                        
                        <a href="https://www.tiktok.com/@ttvrosie" target="_blank" rel="noopener noreferrer">
                            <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-9 h-9">
                                <i className="hn hn-tiktok text-3xl text-border/80 hover:text-accent" />
                            </div>
                        </a>
                        <a href="https://www.youtube.com/@ttvrosie" target="_blank" rel="noopener noreferrer">
                            <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-9 h-9">
                                <i className="hn hn-youtube text-3xl text-border/80 hover:text-accent" />
                            </div>
                        </a>
                        <a href="https://vgen.co/rosieuna" target="_blank" rel="noopener noreferrer">
                            <div className="p-0.5 bg-foreground pixel-borders flex items-center justify-center w-9 h-9">
                                <i className="hn hn-highlight text-3xl text-border/80 hover:text-accent" />
                            </div>
                        </a>
                    </div>
                    
                </div>
            </div>
            <footer className="w-full flex items-center px-2 gap-2 main-text bg-foreground rounded-b py-[3px] border-t-2">
                <button className="pixel-btn text-[12px]" onClick={() => onOpenCard?.("opgg")}>opgg</button>
                <button className="pixel-btn text-[12px]" onClick={() => onOpenCard?.("movies")}>movies</button>
                <button className="pixel-btn text-[12px]" onClick={() => onOpenCard?.("intList")}>intlist</button>
                <button className="pixel-btn text-[12px]" onClick={() => onOpenCard?.("catPictures")}>cat</button>
            </footer>
        </div>
        
    )
}