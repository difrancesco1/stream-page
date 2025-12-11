"use client";

import MainCard from "./main-card";

export default function CardContainer() {
    return (
        <div className="w-full h-full bg-card border border-border p-2 rounded-lg shadow-md flex items-center justify-center">
            <MainCard />
        </div>
    );
}