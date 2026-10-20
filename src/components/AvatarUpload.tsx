'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { uploadAvatar } from '@/app/auth/actions'
import { Camera, Loader2, User } from 'lucide-react'

interface AvatarUploadProps {
  currentUrl: string | null
  fullName: string
}

export function AvatarUpload({ currentUrl, fullName }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)

    // Local preview immediately
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)

    const formData = new FormData()
    formData.append('avatar', file)

    const res = await uploadAvatar(formData)
    setUploading(false)

    if (res?.error) {
      setError(res.error)
      // Revert to original if failed
      setAvatarUrl(currentUrl)
    } else if (res?.avatarUrl) {
      setAvatarUrl(res.avatarUrl)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 border-2 border-emerald-500 shadow-md flex items-center justify-center relative">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName || 'Avatar'}
              fill
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

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition active:scale-95 disabled:opacity-50"
          title="Cambiar foto de perfil"
        >
          <Camera className="w-4 h-4" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-[11px] text-red-600 mt-2 text-center max-w-xs">{error}</p>
      )}
    </div>
  )
}
