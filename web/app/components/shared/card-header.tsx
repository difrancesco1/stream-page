"use client";

import { ReactNode } from "react";
import Topbar from "./topbar";
import Tabs from "./tabs";

interface CardHeaderProps {
  title: string;
  exitbtn?: boolean;
  onClose?: () => void;
  showTabs?: boolean;
  tabs?: { title: string }[];
  activeTab?: { title: string };
  setActiveTab?: (tab: { title: string }) => void;
  children?: ReactNode;
}

export default function CardHeader({
  title,
  exitbtn = false,
  onClose,
  showTabs = false,
  tabs,
  activeTab,
  setActiveTab,
  children,
}: CardHeaderProps) {
  return (
    <>
      <div className="col-start-1 col-end-6 row-start-1 mx-[var(--spacing-xs)] my-[var(--spacing-xs)] relative pointer-events-none">
        {showTabs && (
          <>
            <div className="pixel-borders-top h-[2.97rem] w-full" />
            <div className="border border-t-0 w-full h-[1.75rem] border-[length:var(--border-width)] border-border absolute top-[1.125rem] left-0" />
            <div className="border border-l-0 border-r-0 border-t-0 border-[length:var(--border-width)] border-border absolute top-[2.78rem] inset-x-[calc(var(--spacing-xs)*-1)]" />
          </>
        )}
      </div>
      <div className="col-start-1 col-end-6 row-start-1 row-end-5 flex flex-col justify-start h-full overflow-hidden">
        <div className="mx-[var(--spacing-xs)] my-[var(--spacing-xs)] flex flex-col gap-[0.1875rem] flex-shrink-0">
          <Topbar title={title} exitbtn={exitbtn} onClose={onClose} />
          {showTabs && tabs && activeTab && setActiveTab && (
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
        {children}
      </div>
    </>
  );
}

