"use client"
import { useState } from "react"
import CardHeader from "../shared/card-header"
import IntListPlayerCard from "./int-list-player-card"
import IntListFooter from "./int-list-footer"

interface IntListCardProps {
    onClose?: () => void;
}

const tabs = [
    { title: "int list" },
    { title: "Viewer" },
];

export default function IntListCard({ onClose }: IntListCardProps) {
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
            >
                <div className="px-1 py-1 w-full h-full">
                    <IntListPlayerCard />
                </div>
                <IntListFooter />
            </CardHeader>
        </div>
    )
}