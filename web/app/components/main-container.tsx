"use client"
import Image from "next/image"


export default function MainContainer() {
    return (
        <div className="col-span-9 w-full h-full overflow-y-auto border-l flex flex-col gap-2 relative">
            <div className="flex flex-col flex-start px-1 py-1 gap-1 border-b-2">
                <div className="main-text bg-accent/40 w-fit rounded-sm px-1 pixel-borders bg-accent/60">Biography</div>
                <div className="flex gap-1 items-center">
                    <Image src="/icon/heart.png" alt="icon" width={0} height={0} sizes="100vw" className="w-4 h-4 object-contain"/>
                    <span className="main-text">twitch streamer</span>
                </div>
                <div className="flex gap-1 items-center">
                    <Image src="/icon/heart.png" alt="icon" width={0} height={0} sizes="100vw" className="w-4 h-4 object-contain"/>
                    <span className="main-text">Software Engineer @ Seattle WA</span>
                </div>
                <div className="flex justify-start gap-1 py-1">
                    <div className="p-0.5 bg-background pixel-borders">
                        <Image src="/icon/twitch.png" alt="icon" width={0} height={0} sizes="100vw" className="w-4 h-4 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-background pixel-borders">
                        <Image src="/icon/twitter.png" alt="icon" width={0} height={0} sizes="100vw" className="w-4 h-4 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-background pixel-borders">
                        <Image src="/icon/vgen.png" alt="icon" width={0} height={0} sizes="100vw" className="w-4 h-4 object-contain" unoptimized/>                    
                    </div>
                    <div className="p-0.5 bg-background pixel-borders">
                        <Image src="/icon/tik-tok.png" alt="icon" width={0} height={0} sizes="100vw" className="w-4 h-4 object-contain" unoptimized/>
                    </div>
                    <div className="p-0.5 bg-background pixel-borders">
                        <Image src="/icon/youtube.png" alt="icon" width={0} height={0} sizes="100vw" className="w-4 h-4 object-contain" unoptimized/>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-start mx-1 gap-2 h-full">
                <div className="main-text bg-accent/40 w-fit rounded-sm px-1 pixel-borders bg-accent/60">My work</div>
                <div className="flex gap-2">
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img1.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img2.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img3.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img4.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                    <div className="pixel-borders p-0.5 bg-accent/30">
                        <Image src="/art/img5.gif" alt="icon" width={0} height={0} sizes="100vw" className="w-14 h-14 object-contain" unoptimized/>
                    </div>
                </div>
            </div>
            <footer className="w-full flex items-center justify-center gap-4 main-text border-t-2 bg-foreground rounded-b py-1">
                <button className="pixel-btn">opgg</button>
                <button className="pixel-btn">movies</button>
                <button className="pixel-btn">int list</button>
                <button className="pixel-btn">cat pictures</button>
            </footer>
        </div>
        
    )
}