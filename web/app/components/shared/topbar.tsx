"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export type TopbarBackIcon = "arrow" | "home";

interface TopbarProps {
  title: string;
  exitbtn?: boolean;
  onClose?: () => void;
  variant?: "window" | "section";
  backHref?: string;
  backIcon?: TopbarBackIcon;
  backLabel?: string;
}

export default function Topbar({
  title,
  exitbtn = false,
  onClose,
  variant = "window",
  backHref,
  backIcon,
  backLabel,
}: TopbarProps) {
  const containerCls =
    variant === "section"
      ? `bg-background h-6 pr-[1] pixel-borders border-accent
         flex items-center justify-between`
      : `drag-handle bg-background h-5 pl-1 pixel-borders border-accent
         flex items-center justify-between cursor-grab active:cursor-grabbing`;

  const titleCls =
    variant === "section" ? "main-text !text-[1.1rem] pb-[1.5]" : "main-text";

  const showIcon = Boolean(backHref || backIcon);
  const effectiveIcon: TopbarBackIcon = backIcon ?? "arrow";
  const Icon = effectiveIcon === "home" ? Home : ArrowLeft;
  const ariaLabel =
    backLabel ?? (effectiveIcon === "home" ? "Home" : "Go back");
  const baseIconCls =
    "pixel-borders flex items-center justify-center w-[2rem] h-[1.20rem] shrink-0";

  return (
    <div className={containerCls}>
      <div className="flex items-center gap-[2] min-w-0">
        {showIcon &&
          (backHref ? (
            <Link
              href={backHref}
              className={`${baseIconCls} pixel-btn-border cursor-pointer
                hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]
                transition-colors`}
              aria-label={ariaLabel}
            >
              <Icon className="w-[0.875rem] h-[0.875rem]" strokeWidth={2.5} />
            </Link>
          ) : (
            <span
              className={`pl-1 pr-[2] bg-background text-[color:var(--border)] pointer-events-none`}
              aria-hidden="true"
            >
              <Icon className="w-[0.875rem] h-[0.875rem]" strokeWidth={2.5} />
            </span>
          ))}
          {title !== "shop" &&
          <span className={`${titleCls} truncate`}>{title}</span>
           }
        
      </div>
      {variant === "window" && exitbtn && (
        <button
          type="button"
          className="pixel-borders pixel-btn-remove-sm -mx-[0.1rem]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose?.();
          }}>
          <span className="text-xs font-bold leading-none">×</span>
        </button>
      )}
    </div>
  );
}
