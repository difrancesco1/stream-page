"use client"
import Image from "next/image"
import { useProfile } from "@/app/context/profile-context";
import { getImageUrl, isBackendImage } from "@/lib/api";

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

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
    const twitterHandle = extractTwitterHandle(profile?.social_links || null);
    
    return (
        <div className="col-span-8 w-full h-full overflow-y-auto flex flex-col relative border-l-2 border-t-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex flex-col flex-start ">
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
                        <div className="relative w-full aspect-video ">
<Image
                                                src={featuredImage}
                                                alt="Featured"
                                                fill
                                                className="rounded-sm object-cover"
                                                unoptimized={isBackendImage(profile?.featured_image)}
                                            />
                                <a 
                                    className="absolute alt-text bottom-0 right-0 mx-1" 
                                    target="_blank" 
                                    href="https://x.com/Fourdee2"
                                >
                                    @Fourdee
                                </a>
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
