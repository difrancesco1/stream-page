"use client";

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
    return (
        <div className="flex items-center justify-start gap-0.5 h-5 relative ml-0.5 pb-[1px]">
            {tabs.map((tab) => (
                <div className="relative cursor-pointer" key={tab.title} onClick={() => setActiveTab(tab)}>
                    {activeTab.title === tab.title ? (
                        <>
                            <div className="bg-white absolute mt-0.5 w-[calc(100%_-_4px)] left-0.5 pointer-events-none rounded-t-sm h-0.5 border-accent!"></div>
                            <div className="absolute mt-[3px] w-[calc(100%_-_6px)] left-[3.1px] pointer-events-none z-[10] h-[1px] bg-accent! z-[11]"></div>
                            <div className="border rounded-t-sm px-0.5 bg-accent h-5.5 flex items-center justify-center border-accent!">
                                <span className="main-text text-background!">{tab.title}</span>
                            </div>
                        </>
                    ) : (
                        <>
                        <div className="bg-foreground absolute mt-0.5 w-[calc(100%_-_4px)] left-0.5 pointer-events-none rounded-t-sm h-0.5"></div>
                        <div className="absolute mt-[3px] w-[calc(100%_-_6px)] left-[3.1px] pointer-events-none z-[10] h-[1px] bg-border! z-[11]"></div>
                        <div className="border rounded-t-sm px-0.5 bg-border h-5.5 flex items-center justify-center">
                        <span className="main-text text-background!">{tab.title}</span>
                        </div>
                        </>
                    )}
                    
                </div>
            ))}
        </div>
    );
}