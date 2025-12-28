"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/app/context/auth-context"
import { uploadCatImage } from "@/app/api/cat/actions"

interface CatPicturesFooterProps {
    onImageUploaded?: () => void;
}

export default function CatPicturesFooter({ onImageUploaded }: CatPicturesFooterProps) {
    const { token, user } = useAuth()
    const [isUploading, setIsUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Check file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
            if (!validTypes.includes(file.type)) {
                alert('Invalid file type. Please select a PNG, JPG, or GIF image.')
                return
            }
            setSelectedFile(file)
        }
    }

    const handleUpload = async () => {
        if (!token || !selectedFile) return
        
        setIsUploading(true)
        
        const formData = new FormData()
        formData.append("file", selectedFile)
        
        const result = await uploadCatImage(token, formData)
        
        if (result.success) {
            setSelectedFile(null)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
            if (onImageUploaded) {
                onImageUploaded()
            }
        } else {
            alert(result.error || "Failed to upload image")
        }
        setIsUploading(false)
    }

    // Only show upload UI for authenticated users
    if (!user) {
        return null
    }

    return (
        <div className="px-1 w-full h-[28px] flex items-center gap-1">
            <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.gif"
                onChange={handleFileSelect}
                className="hidden"
                id="cat-file-input"
            />
            <label
                htmlFor="cat-file-input"
                className="pixel-borders pixel-input w-300 cursor-pointer"
            >
                {selectedFile ? selectedFile.name : "Choose image..."}
            </label>
            <button
                className="pixel-borders pixel-btn-border disabled:opacity-50"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
                title="Upload cat image"
            >
                {isUploading ? "..." : "+"}
            </button>
        </div>
    )
}