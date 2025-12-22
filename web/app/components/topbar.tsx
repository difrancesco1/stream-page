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
        px-1 pixel-borders border-accent flex items-center justify-between cursor-grab active:cursor-grabbing"
    >
      <span className="main-text">{title}</span>
      {exitbtn && (
        <button
          className="pixel-borders w-4 h-4 flex items-center justify-center bg-background text-accent hover:bg-accent hover:text-background transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
        >
          <span className="text-xs font-bold leading-none">×</span>
        </button>
      )}
    </div>
  );
}
