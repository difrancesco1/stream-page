"use client";

import { useState } from "react";
import MainContainer from "./main-container";
import ProfileSection from "./profile-section";
import Tabs from "./tabs";
import Topbar from "./topbar";

const tabs: Tab[] = [
  { title: "about" },
  { title: "projects" },
  { title: "contact" },
];

interface Tab {
  title: string;
}

interface IntListProps {
  onClose?: () => void;
}

export default function IntList({ onClose }: IntListProps) {
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);
  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
  };
  return (
    <div className="wrapper pixel-borders pixel-card w-full max-w-[500px] h-auto min-h-[305px] aspect-[5/3] bg-foreground">
      <div className="col-start-1 col-end-6 row-start-1 mx-0.5 my-0.5 relative pointer-events-none">
        <div className="pixel-borders-top h-[47.45px] w-full" />
        <div className="border border-t-0 w-full h-[28.45px] border-[2px] border-border absolute top-4.5 left-0" />
        <div className="border border-l-0 border-r-0 border-t-0 border-[2px] border-border absolute top-[2.78rem] inset-x-[-0.125rem]" />
      </div>
      <div className="col-start-1 col-end-6 row-start-1 row-end-5 flex flex-col justify-start h-full overflow-hidden">
        <div className="mx-0.5 my-0.5 flex flex-col gap-1 flex-shrink-0">
          <Topbar title="int list" exitbtn={true} onClose={onClose} />
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={handleTabClick}
          />
        </div>
        <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
          <ProfileSection />
          <MainContainer />
        </div>
      </div>
    </div>
  );
}
