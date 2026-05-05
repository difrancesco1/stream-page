"use client"

import { useEffect } from "react"

export default function Opgg() {
    useEffect(() => {
        window.location.replace("https://op.gg/lol/multisearch/na?summoners=ignisfirebloom%23pass%2Cziggs7%23rosie%2Cduoanyone%23addme%2CNEW+PLAYER%23CHUD")
    }, [])

    return null
}