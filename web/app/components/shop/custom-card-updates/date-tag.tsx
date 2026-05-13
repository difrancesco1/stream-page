"use client"

interface DateTagProps {
    date: string | Date;
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

function ordinalSuffix(day: number): string {
    const mod100 = day % 100;
    if (mod100 >= 11 && mod100 <= 13) return "th";
    switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

function formatTapeDate(input: string | Date): string {
    const d = typeof input === "string" ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) return "";
    const month = monthFormatter.format(d);
    const day = d.getDate();
    return `${month} ${day}${ordinalSuffix(day)}`;
}

export default function DateTag({ date }: DateTagProps) {
    const label = formatTapeDate(date);
    if (!label) return null;
    return (
        <div
            className="absolute top-1 -left-2 z-10 -rotate-12
                bg-[color:var(--accent)]/85
                border-y border-[color:var(--accent-shadow)]
                px-[var(--spacing-sm)] py-[0.05rem]
                main-text text-[0.65rem] leading-none
                text-[color:var(--border)]
                shadow-[0_1px_0_0_rgba(0,0,0,0.15)]
                pointer-events-none select-none"
        >
            {label}
        </div>
    )
}
