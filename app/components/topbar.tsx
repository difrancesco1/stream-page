"use client";

export default function Topbar() {
    return (
        <div className="drag-handle bg-background h-5
        px-1 pixel-borders border-accent flex items-center justify-between cursor-grab active:cursor-grabbing">
            <span className="main-text">about</span>
        </div>
    );
}