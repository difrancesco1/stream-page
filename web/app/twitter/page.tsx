"use client"

import { useEffect } from "react"

export default function Twitter() {
    useEffect(() => {
        window.location.replace("https://x.com/ttvrosie")
    }, [])

    return null
}