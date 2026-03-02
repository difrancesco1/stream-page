"use client"

import FirstTrackerCard from "./first-tracker-card"
import FirstTrackerFooter from "./first-tracker-footer"
import CardHeader from "../shared/card-header"

interface DuoTrackerContainerProps {
    onClose?: () => void;
    onMouseDown?: () => void;
    isRosie?: boolean;
}

export default function FirstTrackerContainer({onClose, onMouseDown, isRosie}: DuoTrackerContainerProps) {
    return (
        <div 
            className="wrapper pixel-borders pixel-card w-full max-w-[12rem] h-auto min-h-[28rem] aspect-[5/3] bg-foreground"
            onMouseDown={onMouseDown}
        >
            <CardHeader
                title="first in rosie's stream"
                exitbtn={true}
                onClose={onClose}
                showTabs={false}
            >
                <FirstTrackerCard />
                <FirstTrackerFooter isRosie={isRosie} />
            </CardHeader>

        </div>
    )
}