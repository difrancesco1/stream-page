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
        <div className="col-span-4 flex flex-col gap-[0.2rem] items-center h-full overflow-hidden py-[0.125rem] border-t-2 select-none">
            <div className="flex flex-col w-full justify center items-center gap-[var(--spacing-xs)]">
                <div className="relative w-[95%] aspect-square flex-shrink-0">
                    <Image
                        src={profilePicture}
                        alt="Profile"
                        fill
                        className="pixel-borders-dome rounded-sm object-cover"
                        unoptimized={isBackendImage(profile?.profile_picture)}
                    />
                </div>
                <div className="w-[60%] flex items-center">
                    <span className="text-center text-accent w-full leading-tight bg-background pixel-borders hover:animate-spin">
                        {isLoading ? "..." : displayName}
                    </span>
                </div>
            </div>
            <div className="w-full px-1 pt-[var(--spacing-xs)] main-text flex flex-col -mt-[0.3125rem]">
                <div className="flex gap-[3%] flex-start">
                    <span className="font-bold">bday</span>
                    <div>{isLoading ? "[--/--]" : formattedBirthday}</div>
                </div>
                <div className="pixel-borders relative -mt-[0.1875rem] bg-background">
                    <div className="h-[0.1875rem]"></div>
                    <div className="h-[0.0625rem] absolute top-0 w-[77%] bg-accent left-[0.15rem]"></div>
                    <div className="h-[var(--spacing-xs)] absolute top-[0.15rem] w-[74%] bg-accent left-[0.35rem]"></div>
                    <div className="h-[var(--size-progress-bar)] bg-accent w-[80%]"></div>
                    {age && (
                        <span className="top-[-0.05rem] absolute left-[2.1875rem] text-[0.7525rem] text-foreground animate-pulse">
                            {age}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex gap-1 py-[var(--spacing-xs)] px-1">
                {socialLinks.map((social, index) => (
                    <a key={index} href={social.url} target="_blank" rel="noopener noreferrer">
                        <div className="p-0.5 flex items-center justify-center w-[var(--size-icon-social)] h-[1.25rem]">
                            <i className={`hn ${getSocialIconClass(social.platform)} text-border hover:animate-bounce pixel-borders bg-background`} />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}