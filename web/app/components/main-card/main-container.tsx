"use client"
import Image from "next/image"
import { useProfile } from "@/app/context/profile-context";
import { getImageUrl, isBackendImage } from "@/lib/api";

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures" | "duoTracker" | "firstTracker";

interface MainContainerProps {
    onOpenCard?: (cardId: CardId) => void;
}

function extractTwitterHandle(socialLinks: Array<{ platform: string; url: string }> | null): string | null {
    if (!socialLinks) return null;
    
    const twitterLink = socialLinks.find(
        link => link.platform.toLowerCase() === "twitter" || link.platform.toLowerCase() === "x"
    );
    
    if (!twitterLink) return null;
    
    // Extract handle from URL patterns like:
    // https://x.com/username
    // https://twitter.com/username
    // @username
    try {
        const url = twitterLink.url;
        if (url.startsWith("@")) {
            return url;
        }
        
        const match = url.match(/(?:x\.com|twitter\.com)\/([^/?]+)/);
        if (match && match[1]) {
            return `@${match[1]}`;
        }
    } catch {
        // Fall through to return null
    }
    
    return null;
}

export default function MainContainer({ onOpenCard }: MainContainerProps) {
    const { profile, isLoading } = useProfile();
    
    const biography = profile?.biography || [];
    const featuredImage = getImageUrl(profile?.featured_image) || "/wide-rose.png";
    const tokenImage = "/token.png";
    const stickerImage = "/stickers.png";
    const chipsImage = "/chips.png";
    
    return (
        <div className="col-span-8 w-full h-full overflow-y-auto flex flex-col relative border-l-2 border-t-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex flex-col flex-start">
                {isLoading ? (
                    <div className="flex gap-1 items-center px-1">
                        <span className="main-text">...</span>
                    </div>
                ) : (
                    biography.map((line, index) => (
                        <div key={index} className="flex gap-1 items-center px-1">
                            <span className="main-text">{line}</span>
                        </div>
                    ))
                )}
                <div className="justify-start">
                    <div className="flex py-1 border-t-2 px-1 ">
                        <div className="relative w-full aspect-video">
                            <Image
                                src={featuredImage}
                                alt="Featured"
                                fill
                                className="rounded-sm object-cover"
                                unoptimized={isBackendImage(profile?.featured_image)}
                            />
                            <button
                                className="absolute top-1 left-1/2 -translate-x-1/2 z-10 pixel-btn text-xs w-[calc(100%-0.5rem)] opacity-50 hover:opacity-90"
                                onClick={() => onOpenCard?.("firstTracker")}
                            >
                                first in stream
                            </button>
                            <button
                                className="absolute top-1 my-6 left-1/2 -translate-x-1/2 z-10 pixel-btn text-xs w-[calc(100%-0.5rem)] opacity-50 hover:opacity-90"
                                onClick={() => onOpenCard?.("duoTracker")}
                            >
                                duo tracker
                            </button>
                            <div className="absolute top-1 my-[2.55rem] left-1/2 -translate-x-1/2 z-10 text-xs w-[calc(100%-0.3rem)] px-[0.1rem] flex items-center h-[4.5rem] ">
                                <button className="pixel-btn-w flex flex-col items-center overflow-hidden opacity-50 hover:opacity-90">
                                    <Image 
                                        src={tokenImage}
                                        alt="x"
                                        width={100}
                                        height={100}
                                        className="object-cover object-center w-25 h-9" />
                                    <p>cards</p>
                                </button>
                                <button className="pixel-btn-w flex flex-col items-center overflow-hidden  opacity-50 hover:opacity-90">
                                    <Image 
                                        src={stickerImage}
                                        alt="x"
                                        width={100}
                                        height={100}
                                        className="object-cover object-center w-25 h-9" />
                                    <p>stickers</p>
                                </button>
                                <button className="pixel-btn-w flex flex-col items-center overflow-hidden  opacity-50 hover:opacity-90">
                                    <Image 
                                        src={chipsImage}
                                        alt="x"
                                        width={100}
                                        height={100}
                                        className="object-cover object-center w-25 h-9" />
                                    <p>+more</p>
                                </button>
                            </div>
                            <a
                                className="absolute alt-text-w bottom-0 right-0 mx-1"
                                target="_blank"
                            >
                                grand archive TCG fan products
                            </a>
                        </div>
                    </div>


                </div>
            </div>
            <footer className="h-full w-full flex items-center justify-center gap-[var(--spacing-md)] main-text rounded-b border-t-2">
                <button className="pixel-btn hover:animate-pulse" onClick={() => onOpenCard?.("opgg")}>opgg</button>
                <button className="pixel-btn hover:animate-pulse" onClick={() => onOpenCard?.("movies")}>movies</button>
                <button className="pixel-btn hover:animate-pulse" onClick={() => onOpenCard?.("intList")}>intlist</button>
                <button className="pixel-btn hover:animate-pulse" onClick={() => onOpenCard?.("catPictures")}>cat</button>
            </footer>
        </div>
        
    )
}
