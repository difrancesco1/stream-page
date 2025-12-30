"use client";

import Image from "next/image";
import { useProfile } from "@/app/context/profile-context";

function calculateAge(birthday: string | null): string | null {
    if (!birthday) return null;
    
    // Handle format like "10/07" (month/day) - assume current year
    // Or handle full date format like "10/07/1994" or "1994-10-07"
    try {
        let birthDate: Date;
        
        if (birthday.includes("/")) {
            const parts = birthday.split("/");
            if (parts.length === 2) {
                // Format: MM/DD - use current year
                const currentYear = new Date().getFullYear();
                birthDate = new Date(`${currentYear}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
            } else if (parts.length === 3) {
                // Format: MM/DD/YYYY
                birthDate = new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
            } else {
                return null;
            }
        } else {
            birthDate = new Date(birthday);
        }
        
        if (isNaN(birthDate.getTime())) return null;
        
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return `${age}yr`;
    } catch {
        return null;
    }
}

function formatBirthday(birthday: string | null): string {
    if (!birthday) return "[--/--]";
    
    // If already in MM/DD format, return as is
    if (birthday.match(/^\d{1,2}\/\d{1,2}$/)) {
        return `[${birthday}]`;
    }
    
    // Try to parse and format as MM/DD
    try {
        const date = new Date(birthday);
        if (!isNaN(date.getTime())) {
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDate().toString().padStart(2, "0");
            return `[${month}/${day}]`;
        }
    } catch {
        // Fall through to return original
    }
    
    return `[${birthday}]`;
}

function getSocialIconClass(platform: string): string {
    const platformLower = platform.toLowerCase();
    if (platformLower === "twitch") return "hn-twitch";
    if (platformLower === "twitter" || platformLower === "x") return "hn-twitter";
    if (platformLower === "tiktok") return "hn-tiktok";
    if (platformLower === "youtube") return "hn-youtube";
    if (platformLower === "highlight" || platformLower === "vgen") return "hn-highlight";
    return "hn-twitter"; // Default fallback
}

export default function ProfileSection() {
    const { profile, isLoading } = useProfile();
    
    const displayName = profile?.display_name || "Rosie";
    const profilePicture = profile?.profile_picture || "/profile.gif";
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