"use client"

import CardHeader from "../shared/card-header"
import CatPicturesFooter from "./cat-pictures-footer"
import CatPictureCard from "./cat-picture-card"

interface CatPicturesContainerProps {
    onClose?: () => void;
}

export default function CatPictureContainer ({onClose}: CatPicturesContainerProps) {
    return (
        <div className="relative wrapper pixel-borders pixel-card w-full max-w-[400px] h-auto min-h-[280px] aspect-[5/3] bg-foreground">
            <CardHeader
                title="cat pics"
                exitbtn={true}
                onClose={onClose}
                showTabs={false}
            >
            <div>
                <CatPictureCard />
            </div>
            <CatPicturesFooter />
            </CardHeader>
        </div>
    )
}