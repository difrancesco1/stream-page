"use client"

import { useState } from "react";
import CardHeader from "../card-header"
import OppggCardFooter from "./opgg-card-footer";
import OpggGameCard from "./opgg-game-card";

interface OpggCardProps {
    onClose?: () => void;
}

const tabs = [
    {title: "account 1"},
    {title: "account 2"},
]

export default function OpggCard ({ onClose }: OpggCardProps) {
    const [activeTab, setActiveTab] = useState(tabs[0]);
    
    return (
        <>
            <div className="relative wrapper pixel-borders pixel-card w-full max-w-[400px] h-auto min-h-[280px] aspect-[5/3] bg-foreground">

                <CardHeader
                    title="opgg"
                    exitbtn={true}
                    onClose={onClose}
                    showTabs={true}
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                >
                <div className="px-2 py-2 w-full h-full">
                    <OpggGameCard />
                </div>
                <OppggCardFooter />
                </CardHeader>
            </div>
        </>
    )
}