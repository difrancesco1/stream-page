"use client";
import { useState } from "react";
import Topbar from "./topbar";
import Tabs from "./tabs";

const tabs = [
    {
        title: "about",
    },
    {
        title: "projects",
    },
    {
        title: "contact",
    },
]

export default function MainCard() {
    const [activeTab, setActiveTab] = useState(tabs[0]);
    const handleTabClick = (tab: { title: string }) => {
        setActiveTab(tab);
    };
    return (
        <div className="wrapper pixel-borders w-[500px] h-[300px] bg-foreground" >
            <div className="col-start-1 col-end-6 row-start-1 mx-0.5 my-0.5 relative">
                <div className="pixel-borders-top h-[47.45px] w-full"/>
                <div className="border border-t-0 w-full h-[28.45px] border-[2px] border-border absolute top-4.5 left-0"/>
                <div className="border border-l-0 border-r-0 border-t-0 border-[2px] border-border absolute top-[2.78rem] inset-x-[-0.125rem]"/>
            </div>
            <div className="col-start-1 col-end-6 row-start-1 mx-0.5 my-0.5 flex flex-col justify-start gap-1">
                <Topbar/>
                <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={handleTabClick} />
            </div>
        </div>
    );
}