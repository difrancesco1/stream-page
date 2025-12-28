"use client"

import { useState } from "react"
import CardHeader from "../shared/card-header"
import CatPicturesFooter from "./cat-pictures-footer"
import CatPictureCard from "./cat-picture-card"

interface CatPicturesContainerProps {
    onClose?: () => void;
    onMouseDown?: () => void;
}

export default function CatPictureContainer({onClose, onMouseDown}: CatPicturesContainerProps) {
    const [refreshKey, setRefreshKey] = useState(0)

    const handleImageChange = () => {
        // Force refresh of the card by changing key
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div 
            className="wrapper pixel-borders pixel-card w-full max-w-[400px] h-auto min-h-[280px] aspect-[5/3] bg-foreground"
            onMouseDown={onMouseDown}
        >
            <CardHeader
                title="cat pics"
                exitbtn={true}
                onClose={onClose}
                showTabs={false}
            >
            <div key={refreshKey} className="px-1 py-1 w-full h-[calc(100%-24px)] overflow-y-auto border-t-2">
                <CatPictureCard onImageDeleted={handleImageChange} />
            </div>
            <CatPicturesFooter onImageUploaded={handleImageChange} />
            </CardHeader>
        </div>
    )
}