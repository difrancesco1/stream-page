"use client"

import { useState } from "react";
import CardHeader from "../shared/card-header"
import OppggCardFooter from "./opgg-card-footer";
import OpggGameCard from "./opgg-game-card";

interface OpggCardProps {
    onClose?: () => void;
}

const tabs = [
    {title: "/all"},
    {title: "1"},
    {title: "2"},
    {title: "3"},
    {title: "4"},
    {title: "5"},
]

export default function OpggCard ({ onClose }: OpggCardProps) {
    const [activeTab, setActiveTab] = useState(tabs[0]);
    
    return (
        <>
            <div className="relative wrapper pixel-borders pixel-card w-full max-w-[200px] h-auto min-h-[350px] aspect-[5/3] bg-foreground">
                <CardHeader
                    title="opgg"
                    exitbtn={true}
                    onClose={onClose}
                    showTabs={true}
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                >
                <div className="px-1 py-1 w-full h-full">
                    <OpggGameCard />
                </div>
                <OppggCardFooter />
                </CardHeader>
            </div>
        </>
    )
}