"use client"

import DateTag from "./date-tag"

interface WaitlistCardProps {
    imageUrl: string;
    discordHandle: string;
    orderCreatedAt: string;
}

export default function WaitlistCard({ imageUrl, discordHandle, orderCreatedAt }: WaitlistCardProps) {
    return (
        <div className="flex items-center justify-center">
            <div className="relative flex flex-col w-[90%] bg-foreground pixel-borders self-start ">
                <div className="relative w-full block aspect-[1/1]">
                    {/* Plain <img>: Supabase URLs aren't whitelisted in next.config. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt={`Card art for ${discordHandle}`}
                        className="absolute inset-0 w-full h-full object-contain"
                    />
                    <DateTag date={orderCreatedAt} />
                </div>
                <div className="border-t-[length:var(--border-width)] border-[color:var(--border)]
                    px-[var(--spacing-sm)]
                    text-center text-[0.675rem] py-1 bg-border
                    text-[color:var(--white)] leading-none truncate">
                    <h1>{discordHandle}</h1>
                </div>
            </div>

        </div>
    )
}