"use client"

import { useEffect } from "react"

export default function First() {
    useEffect(() => {
        window.location.replace("https://docs.google.com/spreadsheets/d/1RgJpwOz3R4aUFRC63jH8T4XpcmV77ekBOpWZbB-Uw1M/edit?gid=0#gid=0")
    }, [])

    return null
}