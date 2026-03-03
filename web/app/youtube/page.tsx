"use client"

import { useEffect } from "react"

export default function Youtube() {
    useEffect(() => {
        window.location.replace("https://www.youtube.com/@roziggz")
    }, [])

    return null
}