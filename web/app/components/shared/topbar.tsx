"use client";

interface TopbarProps {
  title: string;
  exitbtn?: boolean;
  onClose?: () => void;
}

export default function Topbar({
  title,
  exitbtn = false,
  onClose,
}: TopbarProps) {
  return (
    <div
      className="drag-handle bg-background h-5
        pl-1 pixel-borders border-accent flex items-center 
        justify-between cursor-grab active:cursor-grabbing"
    >
      <span className="main-text">{title}</span>
      {exitbtn && (
        <button
          className="pixel-borders pixel-btn-remove-sm -mx-[2px]"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}>
          <span className="text-xs font-bold leading-none">×</span>
        </button>
      )}
    </div>
  );
}
