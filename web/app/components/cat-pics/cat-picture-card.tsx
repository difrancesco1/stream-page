"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/context/auth-context"
import { fetchCatImages, deleteCatImage, type CatImage } from "@/app/api/cat/actions"
import { getImageUrl } from "@/lib/api"
import Image from "next/image"

interface CatPictureCardProps {
    onImageDeleted?: () => void;
}

export default function CatPictureCard({ onImageDeleted }: CatPictureCardProps) {
    const { user, token } = useAuth()
    const [cats, setCats] = useState<CatImage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadCats = async () => {
        setLoading(true)
        const result = await fetchCatImages()
        if (result.success) {
            setCats(result.cats)
            setError(null)
        } else {
            setError(result.error || "Failed to load cat images")
        }
        setLoading(false)
    }

    useEffect(() => {
        loadCats()
    }, [])

    const handleDelete = async (catId: string) => {
        if (!token) return
        
        const result = await deleteCatImage(token, catId)
        if (result.success) {
            // Refresh the list
            await loadCats()
            if (onImageDeleted) {
                onImageDeleted()
            }
        } else {
            alert(result.error || "Failed to delete image")
        }
    }

    const canDelete = (cat: CatImage) => {
        if (!user) return false
        return user.username === "rosie" || cat.contributor_username === user.username
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs text-border"></p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs text-red-500">{error}</p>
            </div>
        )
    }

    if (cats.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs text-border">meow :(</p>
            </div>
        )
    }

return (
        <div className="grid grid-cols-3 gap-1">
                {cats.map((cat) => (
                    <div key={cat.id} className="relative w-full flex flex-col">
                        <Image
                                src={getImageUrl(cat.image_url)}
                                alt={`Cat by ${cat.contributor_username}`}
                                width={130}
                                height={110}
                                className="pixel-borders bg-white"
                                unoptimized
                            />
                        <div className="absolute pl-1 w-full leading-tight bg-background pixel-borders">
                            <div className="grid-container">
                                <p className="text-[10px] text-border truncate">
                                    {cat.contributor_username}
                                </p>
                                {canDelete(cat) && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleDelete(cat.id);
                                        }}
                                        className="pixel-btn-remove-sm text-border! hover:bg-background! hover:text-accent!"
                                        title="Delete">
                                        x
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
    )}