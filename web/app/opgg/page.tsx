"use client"

import { useEffect } from "react"

export default function Opgg() {
    useEffect(() => {
        window.location.replace("https://op.gg/lol/multisearch/na?summoners=rosie%23twtv%2Cttvrosie%23unc%2Cduoanyone%23addme")
    }, [])

    return null
}