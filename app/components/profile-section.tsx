
import Image from "next/image";

export default function ProfileSection() {
    "use client";
    return (
        <div className="col-span-3 flex flex-col justify-between items-center gap-[3%] h-full overflow-hidden py-[2%]">
            <div className="flex flex-col w-full justify center items-center gap-2">
                <div className="relative w-[65%] aspect-square flex-shrink-0">
                    <Image 
                        src="/profile.jpg" 
                        alt="Profile" 
                        fill
                        className="pixel-borders-dome rounded-sm object-cover"
                    />
                </div>
                <div className="w-[65%] flex items-center pixel-borders bg-accent/60">
                    <span className="text-center text-gray-800 w-full text-[clamp(0.6rem,2vw,1rem)] leading-tight">Rosie</span>
                </div>
            </div>
            <div className="flex gap-[17%] justify-center items-center w-full py-2 border-y">
                <div className="flex flex-col items-center w-[20%]">
                    <div className="relative w-full aspect-square">
                        <Image
                            src="/ziggs-profile.png"
                            alt="Ziggs"
                            fill
                            className="rounded-sm object-cover"
                        />
                    </div>
                    <span className="main-text text-[clamp(0.5rem,1.5vw,0.875rem)]">Ziggs</span>
                </div>
                <div className="flex flex-col items-center w-[20%]">
                    <div className="relative w-full aspect-square">
                        <Image
                            src="/LuluSquare.webp"
                            alt="Ziggs"
                            fill
                            className="rounded-sm object-cover"
                        />
                    </div>
                    <span className="main-text text-[clamp(0.5rem,1.5vw,0.875rem)]">Lulu</span>
                </div>
                </div>
                <span className="w-full text-center text-black text-[clamp(0.5rem,1.5vw,0.875rem)]">Birthday</span>
                <div className="flex justify-center gap-[4%]">
                    <div className="main-text px-[8%] py-[4%] border-2 text-[clamp(0.5rem,1.5vw,0.875rem)]">October</div>
                    <div className="main-text px-[8%] py-[4%] border-2 text-black text-[clamp(0.5rem,1.5vw,0.875rem)]">07</div>
                </div>
                
        </div>
    );
}