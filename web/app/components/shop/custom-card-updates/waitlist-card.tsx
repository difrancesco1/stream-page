"use client"

import Image from "next/image";

interface WaitlistCardProps {
    imageUrl: string;
    discordHandle: string;
    onClick?: () => void;
}

export default function WaitlistCard({ imageUrl, discordHandle, onClick }: WaitlistCardProps) {
    return (
        <div className="flex items-center justify-center">
            <button
                type="button"
                onClick={onClick}
                className="relative flex flex-col w-[90%] bg-foreground pixel-borders self-start cursor-pointer p-0 text-left"
            >
                <div className="relative w-full block aspect-[7/6]">
                    <Image
                        src={imageUrl}
                        alt={`Card art for ${discordHandle}`}
                        fill
                        sizes="(max-width: 768px) 40vw, 160px"
                        className="object-cover"
                    />
                </div>
                <div className="border-t-[length:var(--border-width)] border-[color:var(--border)]
                    px-[var(--spacing-sm)]
                    text-center text-[0.675rem] py-1 bg-border
                    text-[color:var(--white)] leading-none truncate w-full">
                    <h1>{discordHandle}</h1>
                </div>
            </button>
        </div>
    )
}
