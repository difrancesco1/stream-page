"use client";

import Draggable from "react-draggable";
import { useRef, useState, useEffect } from "react";
import MainCard from "./main-card";

export default function CardContainer() {
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    const [defaultPosition, setDefaultPosition] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (containerRef.current && nodeRef.current) {
            const container = containerRef.current.getBoundingClientRect();
            const card = nodeRef.current.getBoundingClientRect();
            
            const centerX = (container.width - card.width) / 2;
            const centerY = (container.height - card.height) / 2;
            
            setDefaultPosition({ x: centerX, y: centerY });
        }
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full bg-card border border-border p-2 rounded-lg shadow-md relative">
            <Draggable 
                nodeRef={nodeRef} 
                bounds="parent" 
                handle=".drag-handle"
                position={defaultPosition ?? undefined}
                onStop={(_, data) => setDefaultPosition({ x: data.x, y: data.y })}
            >
                <div ref={nodeRef} className={`w-fit transition-opacity duration-150 ${defaultPosition === null ? 'opacity-0' : 'opacity-100'}`}>
                    <MainCard />
                </div>
            </Draggable>
        </div>
    );
}