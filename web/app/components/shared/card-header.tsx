"use client";

import { ReactNode } from "react";
import Topbar, { type TopbarBackIcon } from "./topbar";
import Tabs from "./tabs";

interface CardHeaderProps {
  title: string;
  exitbtn?: boolean;
  onClose?: () => void;
  showTabs?: boolean;
  tabs?: { title: string }[];
  activeTab?: { title: string };
  setActiveTab?: (tab: { title: string }) => void;
  variant?: "window" | "section";
  backHref?: string;
  backIcon?: TopbarBackIcon;
  backLabel?: string;
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
  variant = "window",
  backHref,
  backIcon,
  backLabel,
  children,
}: CardHeaderProps) {
  const isSection = variant === "section";
  const decoFrameTop = isSection ? "top-[1.625rem]" : "top-[1.125rem]";
  const decoBottomLine = isSection ? "top-[3.28rem]" : "top-[2.78rem]";
  const decoTopBorderHeight = isSection ? "h-[3.47rem]" : "h-[2.97rem]";
  const gapBetween = isSection ? 'gap-[0.39rem]' : 'gap-[0.1875rem]';

  return (
    <>
      <div className="col-start-1 col-end-6 row-start-1 mx-[var(--spacing-xs)] my-[var(--spacing-xs)] relative pointer-events-none">
        {showTabs && (
          <>
            <div className={`pixel-borders-top ${decoTopBorderHeight} w-full`} />
            <div className={`border border-t-0 w-full h-[1.75rem] border-[length:var(--border-width)] border-border absolute ${decoFrameTop} left-0`} />
            <div className={`border border-l-0 border-r-0 border-t-0 border-[length:var(--border-width)] border-border absolute ${decoBottomLine} inset-x-[calc(var(--spacing-xs)*-1)]`} />
          </>
        )}
      </div>
      <div className="col-start-1 col-end-6 row-start-1 row-end-5 flex flex-col justify-start h-full overflow-hidden">
        <div className= {`mx-[var(--spacing-xs)] my-[var(--spacing-xs)] flex flex-col flex-shrink-0 ${gapBetween}`} >
          <Topbar
            title={title}
            exitbtn={exitbtn}
            onClose={onClose}
            variant={variant}
            backHref={backHref}
            backIcon={backIcon}
            backLabel={backLabel}
          />
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
