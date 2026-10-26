'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { uploadAvatar } from '@/app/auth/actions'
import { Camera, Loader2, User } from 'lucide-react'

interface AvatarUploadProps {
  currentUrl: string | null
  fullName: string
  editable?: boolean
}

async function compressImage(file: File, maxWidth = 400, maxHeight = 400, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    // If not an image, return original
    if (!file.type.startsWith('image/')) {
      return resolve(file)
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return resolve(file)
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file)
            const compressed = new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}.jpeg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressed)
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = event.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export function AvatarUpload({ currentUrl, fullName, editable = true }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0]
    if (!rawFile) return

    setError(null)
    setUploading(true)

    // Local preview immediately
    const previewUrl = URL.createObjectURL(rawFile)
    setAvatarUrl(previewUrl)

    try {
      // Compress image client-side to save Supabase Storage bandwidth and space
      const compressedFile = await compressImage(rawFile, 400, 400, 0.8)

      const formData = new FormData()
      formData.append('avatar', compressedFile)

      const res = await uploadAvatar(formData)
      setUploading(false)

      if (res?.error) {
        setError(res.error)
        setAvatarUrl(currentUrl)
      } else if (res?.avatarUrl) {
        setAvatarUrl(res.avatarUrl)
      }
    } catch {
      setUploading(false)
      setError('Error al procesar la imagen')
      setAvatarUrl(currentUrl)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div className="w-24 h-24 rounded-3xl overflow-hidden bg-neutral-100 border-2 border-neutral-900 shadow-tactile flex items-center justify-center relative">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName || 'Avatar'}
              fill
              unoptimized={avatarUrl.startsWith('blob:')}
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-400">
              <User className="w-10 h-10" />
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {editable && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-tactile absolute -bottom-1 -right-1 p-2 rounded-xl border-2 border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-white shadow-tactile-sm transition active:scale-95 disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Cambiar foto de perfil"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="font-mono text-[11px] text-rose-600 mt-2 text-center max-w-xs">{error}</p>
      )}
    </div>
  )
}
