"use client";

import { useEffect, useState, useRef } from "react";

export function AnimatedCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);
    
    const handleMouseDown = () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      setIsClicking(true);
    };
    
    const handleMouseUp = () => {
      clickTimeoutRef.current = setTimeout(() => {
        setIsClicking(false);
      }, 1000);
    };

    window.addEventListener("mousemove", updatePosition);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, [isVisible]);

  return (
    <img
      src={isClicking ? "/loading.gif" : "/idle-original.gif"}
      alt=""
      aria-hidden="true"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: 48,
        height: 48,
        pointerEvents: "none",
        zIndex: 99999,
        transform: "translate(-2px, -24px)",
        opacity: isVisible ? 1 : 0,
        imageRendering: "pixelated",
      }}
    />
  );
}

