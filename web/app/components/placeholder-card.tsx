"use client";

import Topbar from "./topbar";

interface PlaceholderCardProps {
  title: string;
  onClose?: () => void;
}

export default function PlaceholderCard({ title, onClose }: PlaceholderCardProps) {
  return (
    <div className="wrapper pixel-borders pixel-card w-full max-w-[400px] h-auto min-h-[200px] bg-foreground">
      <div className="col-start-1 col-end-6 row-start-1 row-end-5 flex flex-col justify-start h-full overflow-hidden">
        <div className="mx-0.5 my-0.5 flex flex-col gap-1 flex-shrink-0">
          <Topbar title={title} exitbtn={true} onClose={onClose} />
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <span className="main-text text-muted-foreground">
            {title} content coming soon...
          </span>
        </div>
      </div>
    </div>
  );
}

