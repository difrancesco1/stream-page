
import Image from "next/image";

export default function ProfileSection() {
    "use client";
    return (
        <div className="col-span-4 flex flex-col gap-[2%] items-center h-full overflow-hidden py-[2%] border-t-2 select-none">
            <div className="flex flex-col w-full justify center items-center gap-[2px]">
                <div className="relative w-[95%] aspect-square flex-shrink-0">
                    <Image
                        src="/profile.gif"
                        alt="Profile"
                        fill
                        className="pixel-borders-dome rounded-sm object-cover"
                    />
                </div>
                <div className="w-[60%] flex items-center pixel-borders">
                    <span className="text-center text-foreground w-full leading-tight bg-border/80">Rosie</span>
                </div>
            </div>
            <div className="w-full px-1 pt-[2px] main-text flex flex-col -mt-[5px]">
                <div className="flex gap-[3%] flex-start " >
                    <span className="font-bold">bday</span>
                    <div className="">[10/07]</div>
                </div>
                <div className="pixel-borders relative -mt-[3px]">
                    <div className="h-[3px] "></div>
                    <div className="h-[1px] absolute -top-[0px] w-[77%] bg-accent left-[2.3px]"></div>
                    <div className="h-[2px] absolute top-[2.5px] w-[74%] bg-accent left-[5.5px]"></div>
                    <div className="h-[15px] bg-accent w-[80%]"></div>
                    <span className="top-0 absolute left-[35px] text-[11px] text-foreground animate-pulse">30yr</span>
                </div>
            </div>
            <div className="flex gap-1 py-[2] px-1">
                <a href="https://www.twitch.tv/rosie" target="_blank" rel="noopener noreferrer">
                    <div className="p-0.5 bg-foreground flex items-center justify-center w-[18] h-5">
                        <i className="hn hn-twitch text-border hover:animate-bounce pixel-borders" />
                    </div>
                </a>
                <a href="https://x.com/ttvrosie" target="_blank" rel="noopener noreferrer">
                    <div className="p-0.5 bg-foreground flex items-center justify-center w-[18] h-5">
                        <i className="hn hn-twitter text-border hover:animate-bounce pixel-borders" />
                    </div>
                </a>

                <a href="https://www.tiktok.com/@ttvrosie" target="_blank" rel="noopener noreferrer">
                    <div className="p-0.5 bg-foreground flex items-center justify-center w-[18] h-5">
                        <i className="hn hn-tiktok text-border hover:animate-bounce pixel-borders" />
                    </div>
                </a>
                <a href="https://www.youtube.com/@ttvrosie" target="_blank" rel="noopener noreferrer">
                    <div className="p-0.5 bg-foreground  flex items-center justify-center w-[18] h-5">
                        <i className="hn hn-youtube text-border hover:animate-bounce pixel-borders" />
                    </div>
                </a>
                <a href="https://vgen.co/rosieuna" target="_blank" rel="noopener noreferrer">
                    <div className="p-0.5 bg-foreground flex items-center justify-center w-[18] h-5">
                        <i className="hn hn-highlight text-border hover:animate-bounce pixel-borders" />
                    </div>
                </a>
            </div>
        </div>
    );
}