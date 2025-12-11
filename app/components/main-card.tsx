"use client";
import Topbar from "./topbar";
export default function MainCard() {
    return (
        <div className="wrapper pixel-borders w-[300px] h-[200px] bg-foreground
            border border-border rounded-lg flex flex-col justify-start mx-0.5 my-0.5" >
            <div className="col-start-1 col-end-6 row-start-1 row-end-5 mx-0.5 my-0.5">
                <div className=" pixel-borders h-15 w-full"/>
            </div>
            <div className="col-start-1 col-end-6 row-start-1 mx-0.5 my-0.5">
                <Topbar/>
            </div>
        </div>
    );
}