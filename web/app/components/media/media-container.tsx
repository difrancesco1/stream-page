"use client"

import CardHeader from "../shared/card-header";
import { useState } from "react";

interface MediaContainerProps {
    onClose?: () => void;
}

const tabs = [
    {title: "movie"},
    {title: "tv"},
    {title: "kdrama"},
    {title: "anime"},
    {title: "youtube"},
]

export default function MediaContainer ({onClose}: MediaContainerProps) {
    const [activeTab, setActiveTab] = useState(tabs[0]);
    return (
            <div className="relative wrapper pixel-borders pixel-card w-full max-w-[400px] h-auto min-h-[280px] aspect-[5/3] bg-foreground">
                <CardHeader
                    title="int list"
                    exitbtn={true}
                    onClose={onClose}
                    showTabs={true}
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                ></CardHeader>
                </div>    
        )
}