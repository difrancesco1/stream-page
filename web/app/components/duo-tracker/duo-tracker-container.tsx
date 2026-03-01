"use client"

import DuoTrackerCard from "./duo-tracker-card"
import DuoTrackerFooter from "./duo-tracker-footer"
import CardHeader from "../shared/card-header"

interface DuoTrackerContainerProps {
    onClose?: () => void;
    onMouseDown?: () => void;
}

export default function DuoTrackerContainer({onClose, onMouseDown}: DuoTrackerContainerProps) {
    return (
        <div 
            className="wrapper pixel-borders pixel-card w-full max-w-[25rem] h-auto min-h-[17.5rem] aspect-[5/3] bg-foreground"
            onMouseDown={onMouseDown}
        >
            <CardHeader
                title="cat pics"
                exitbtn={true}
                onClose={onClose}
                showTabs={false}
            >
                <DuoTrackerCard/>
                <DuoTrackerFooter/>
            </CardHeader>

        </div>
    )
}