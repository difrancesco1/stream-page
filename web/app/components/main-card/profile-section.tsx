"use client";

import Image from "next/image";
import { useProfile } from "@/app/context/profile-context";
import { getImageUrl, isBackendImage } from "@/lib/api";

function calculateAge(birthday?: string | null): string | null {
    if (!birthday) return null;
    
    const [month, day, year] = birthday.split("/");
    const birthDate = new Date(+year, +month - 1, +day);
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return `${age}yr`;
}

function formatBirthday(birthday?: string | null): string {
    if (!birthday) return "[--/--]";
    const [month, day] = birthday.split("/");
    return `[${month}/${day}]`;
}

function getSocialIconClass(platform: string): string {
    const platformLower = platform.toLowerCase();
    if (platformLower === "twitch") return "hn-twitch";
    if (platformLower === "twitter" || platformLower === "x") return "hn-twitter";
    if (platformLower === "tiktok") return "hn-tiktok";
    if (platformLower === "youtube") return "hn-youtube";
    if (platformLower === "highlight" || platformLower === "vgen") return "hn-highlight";
    if (platformLower === "discord") return "hn-discord"
    return "hn-twitter"; // Default fallback
}

export default function ProfileSection() {
    const { profile, isLoading } = useProfile();
    
    const displayName = profile?.display_name || "Rosie";
    const profilePicture = getImageUrl(profile?.profile_picture) || "/profile.gif";
    const birthday = profile?.birthday;
    const formattedBirthday = formatBirthday(birthday);
    const age = calculateAge(birthday);
    const socialLinks = profile?.social_links || [];
    
    return (
        <div className="col-span-4 flex flex-col gap-[2%] items-center h-full overflow-hidden py-[2%] border-t-2 select-none">
            <div className="flex flex-col w-full justify center items-center gap-[2px]">
                <div className="relative w-[95%] aspect-square flex-shrink-0">
                    <Image
                        src={profilePicture}
                        alt="Profile"
                        fill
                        className="pixel-borders-dome rounded-sm object-cover"
                        unoptimized={isBackendImage(profile?.profile_picture)}
                    />
                </div>
                <div className="w-[60%] flex items-center ">
                    <span className="text-center text-accent w-full leading-tight bg-background pixel-borders hover:animate-spin">
                        {isLoading ? "..." : displayName}
                    </span>
                </div>
            </div>
            <div className="w-full px-1 pt-[2px] main-text flex flex-col -mt-[5px]">
                <div className="flex gap-[3%] flex-start " >
                    <span className="font-bold">bday</span>
                    <div className="">{isLoading ? "[--/--]" : formattedBirthday}</div>
                </div>
                <div className="pixel-borders relative -mt-[3px] bg-background">
                    <div className="h-[3px] "></div>
                    <div className="h-[1px] absolute -top-[0px] w-[77%] bg-accent left-[2.3px]"></div>
                    <div className="h-[2px] absolute top-[2.5px] w-[74%] bg-accent left-[5.5px]"></div>
                    <div className="h-[15px] bg-accent w-[80%]"></div>
                    {age && (
                        <span className="top-0 absolute left-[35px] text-[11px] text-foreground animate-pulse">
                            {age}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex gap-1 py-[2] px-1">
                {socialLinks.map((social, index) => (
                    <a key={index} href={social.url} target="_blank" rel="noopener noreferrer">
                        <div className="p-0.5 flex items-center justify-center w-[18] h-5">
                            <i className={`hn ${getSocialIconClass(social.platform)} text-border hover:animate-bounce pixel-borders bg-background`} />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}