'use client'

import { useState, useRef } from 'react'
import { Camera, X, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

interface PhotoUploaderProps {
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  maxPhotos?: number
  label?: string
  disabled?: boolean
}

export default function PhotoUploader({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  label = 'Photos',
  disabled = false,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const remaining = maxPhotos - photos.length
    const toProcess = Array.from(files).slice(0, remaining)

    toProcess.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        onPhotosChange([...photos, base64])
      }
      reader.readAsDataURL(file)
    })

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const removePhoto = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx)
    onPhotosChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Badge variant="secondary" className="text-xs">
          {photos.length}/{maxPhotos} photos
        </Badge>
      </div>

      {/* Thumbnails grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {photos.map((photo, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={photo}
                alt={`${label} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Delete button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePhoto(idx) }}
                  className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {/* Preview button */}
              <button
                type="button"
                onClick={() => setPreviewIdx(idx)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors"
              >
                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {!disabled && photos.length < maxPhotos && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4 mr-2" />
          Add Photo
        </Button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Full-size preview dialog */}
      <Dialog open={previewIdx !== null} onOpenChange={(open) => { if (!open) setPreviewIdx(null) }}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
          {previewIdx !== null && (
            <img
              src={photos[previewIdx]}
              alt={`${label} ${previewIdx + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
