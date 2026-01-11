"use client"

import { useEffect } from "react"

export default function Opgg() {
    useEffect(() => {
        window.location.replace("https://www.deeplol.gg/strm/rosie")
    }, [])

    return null
}