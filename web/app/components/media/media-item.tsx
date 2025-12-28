"use client"

export default function MediaItem () {
    return (
        <>
            <div className="flex w-full h-[20%] pixel-borders">
                <div className="w-[13%] h-[80%] mx-1 my-1 bg-border pixel-borders"></div>
                <div className="w-full">
                    <div className="grid-container h-[50%]">
                        <span className="main-text">good will hunting</span>
                        <div className="mr-[2px]">
                            <span className="alt-text m-1">- rosie</span>
                            <button className="pixel-borders pixel-btn-remove-sm">+1</button>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="grid-container">
                        <span className="alt-text">heartwarming. think abt life. happy ending.</span>
                    </div>
                </div>
                
            </div>
        </>
    )
}