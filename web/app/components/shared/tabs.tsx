"use client";

import { useRef } from "react";

interface TabProps {
    tabs: {
        title: string;
    }[];
    activeTab: {
        title: string;
    };
    setActiveTab: (tab: { title: string }) => void;
}

export default function Tabs({ tabs, activeTab, setActiveTab }: TabProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollRef.current) {
            e.preventDefault();
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    return (
        <div 
            ref={scrollRef}
            onWheel={handleWheel}
            className="flex items-center justify-start gap-[var(--spacing-xs)] h-[1.375rem] relative ml-[var(--spacing-xs)] pb-[0.0625rem] overflow-x-auto overflow-y-visible scrollbar-hide"
        >
            {tabs.map((tab, index) => (
                <div className="relative cursor-pointer" key={`${tab.title}-${index}`} onClick={() => setActiveTab(tab)}>
                    {activeTab.title === tab.title ? (
                        <>
                            <div className="bg-white absolute mt-[var(--spacing-xs)] w-[calc(100%-var(--spacing-sm))] left-[var(--spacing-xs)] pointer-events-none rounded-t-sm h-[var(--spacing-xs)] border-accent!"></div>
                            <div className="absolute mt-[0.1875rem] w-[calc(100%-0.375rem)] left-[0.1875rem] pointer-events-none z-[10] h-[0.0625rem] bg-accent! z-[11]"></div>
                            <div className="border rounded-t-sm px-[var(--spacing-xs)] bg-accent h-[1.375rem] flex items-center justify-center border-accent!">
                                <span className="main-text text-background!">{tab.title}</span>
                            </div>
                        </>
                    ) : (
                        <>
                        <div className="bg-foreground absolute mt-[var(--spacing-xs)] w-[calc(100%-var(--spacing-sm))] left-[var(--spacing-xs)] pointer-events-none rounded-t-sm h-[var(--spacing-xs)]"></div>
                        <div className="absolute mt-[0.1875rem] w-[calc(100%-0.375rem)] left-[0.1875rem] pointer-events-none z-[10] h-[0.0625rem] bg-border! z-[11]"></div>
                        <div className="border rounded-t-sm px-[var(--spacing-xs)] bg-border h-[1.375rem] flex items-center justify-center">
                        <span className="main-text text-background!">{tab.title}</span>
                        </div>
                        </>
                    )}
                    
                </div>
            ))}
        </div>
    );
}