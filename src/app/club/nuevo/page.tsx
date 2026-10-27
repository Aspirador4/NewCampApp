'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Sparkles,
  AlertCircle,
  Loader2,
  Palette,
  UploadCloud,
  Link2,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react'
import { createClubAction, uploadClubLogoAction } from '@/app/club/actions'
import { PalettePicker } from '@/components/PalettePicker'
import { CLUB_THEME_PALETTES } from '@/utils/theme'

async function compressImage(file: File, maxWidth = 500, maxHeight = 500, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type.includes('svg')) {
    return file
  }

  return new Promise((resolve) => {
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
        if (!ctx) return resolve(file)

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file)
            const compressed = new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            })
            resolve(compressed)
          },
          'image/webp',
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

export default function NuevoClubPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [paletteId, setPaletteId] = useState('emerald')
  const [isManualSlug, setIsManualSlug] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activePalette =
    CLUB_THEME_PALETTES.find((p) => p.id === paletteId) || CLUB_THEME_PALETTES[0]

  const handleNameChange = (val: string) => {
    setName(val)
    if (!isManualSlug) {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(generated)
    }
  }

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setUploadingLogo(true)

    try {
      const compressed = await compressImage(file, 500, 500, 0.85)
      const formData = new FormData()
      formData.append('logo', compressed)

      const res = await uploadClubLogoAction(formData)
      if (res?.error) {
        setUploadError(res.error)
      } else if (res?.logoUrl) {
        setLogoUrl(res.logoUrl)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al procesar la imagen')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('name', name)
    formData.append('slug', slug)
    formData.append('description', description)
    formData.append('palette_id', paletteId)
    if (logoUrl) formData.append('logo_url', logoUrl)

    const res = await createClubAction(formData)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  const clubInitials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : 'CD'

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center gap-2 pt-2 pb-4 border-b-2 border-neutral-900/10 dark:border-white/10">
        <Link
          href="/"
          className="p-2 -ml-1 rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>
        <div>
          <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-neutral-950 dark:text-white leading-none">
            Crear Nuevo Club
          </h1>
          <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
            Configuración de Nueva Institución Deportiva
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Brand Preview Card */}
      <div className="mt-4 p-5 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-[#14161f] shadow-tactile flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-center text-white font-display font-bold text-lg flex-shrink-0 transition-colors overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Vista previa"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            clubInitials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
            Vista Previa de Escudo
          </p>
          <h3 className="font-display font-bold text-xl uppercase tracking-tight text-neutral-950 dark:text-white truncate">
            {name.trim() || 'Nombre de tu Club'}
          </h3>
          <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {slug.trim() ? `/club/unirse/${slug}` : '/club/unirse/...'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <label className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
            Nombre Oficial del Club *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej: Los Pioneros FC"
            className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
              Identificador Único (Slug) *
            </label>
            <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
              Para enlaces de invitación
            </span>
          </div>
          <div className="flex items-center rounded-xl border-2 border-neutral-300 dark:border-neutral-700 focus-within:border-neutral-900 dark:focus-within:border-white bg-white dark:bg-[#14161f] overflow-hidden shadow-2xs">
            <span className="px-3 text-xs text-neutral-400 dark:text-neutral-500 font-mono select-none">
              /club/unirse/
            </span>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setIsManualSlug(true)
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))
              }}
              placeholder="los-pioneros-fc"
              className="w-full py-2.5 pr-3 bg-transparent text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none"
            />
          </div>
          <p className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
            Tus miembros podrán solicitar unirse mediante este enlace.
          </p>
        </div>

        {/* 10 Color Palettes Picker */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 stroke-[2.5]" />
              Color Institucional (10 Paletas Oficiales)
            </label>
            <span
              className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700"
              style={{
                backgroundColor: activePalette.primaryLight,
                color: activePalette.primary,
              }}
            >
              {activePalette.name}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
            Define la personalidad visual del club: botones primarios, medallas y navegación.
          </p>
          <PalettePicker
            selectedId={paletteId}
            onSelect={(id) => setPaletteId(id)}
            disabled={loading}
          />
        </div>

        {/* Logo / Escudo Section with Upload and URL tabs */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 stroke-[2.5]" />
              Escudo o Emblema del Club
            </label>
            <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setLogoMode('upload')}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  logoMode === 'upload'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Cargar Foto
              </button>
              <button
                type="button"
                onClick={() => setLogoMode('url')}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  logoMode === 'url'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                URL Web
              </button>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLogoFileSelect}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
          />

          {uploadError && (
            <p className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{uploadError}</span>
            </p>
          )}

          {logoMode === 'upload' ? (
            <div>
              {logoUrl ? (
                <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-[#14161f] shadow-tactile-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl border border-neutral-300 dark:border-neutral-700 overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Escudo cargado" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white truncate">
                        Escudo cargado con éxito
                      </p>
                      <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Listo para el club
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="btn-tactile px-2.5 py-1.5 rounded-xl border border-neutral-900/20 dark:border-neutral-700 text-xs font-display font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      disabled={uploadingLogo}
                      className="btn-tactile p-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Quitar escudo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-neutral-400 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white bg-white/60 dark:bg-[#14161f]/60 hover:bg-white dark:hover:bg-[#14161f] transition text-center flex flex-col items-center justify-center gap-1.5 group cursor-pointer active:scale-[0.99]"
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-neutral-600 dark:text-neutral-300" />
                      <span className="font-display font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                        Procesando y Subiendo Escudo...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 group-hover:scale-105 transition">
                        <UploadCloud className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <span className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
                        Toca para cargar el escudo desde tu dispositivo
                      </span>
                      <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
                        PNG, JPG, WebP o SVG (máximo 5MB)
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center rounded-xl border-2 border-neutral-300 dark:border-neutral-700 focus-within:border-neutral-900 dark:focus-within:border-white bg-white dark:bg-[#14161f] overflow-hidden shadow-2xs">
                <span className="px-3 text-xs text-neutral-400 dark:text-neutral-500 select-none">
                  <Link2 className="w-3.5 h-3.5" />
                </span>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/escudo.png"
                  className="w-full py-2.5 pr-3 bg-transparent text-xs font-mono font-medium text-neutral-900 dark:text-white focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
                />
              </div>
              <p className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
                Pega el enlace directo a una imagen alojada en la web.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
            Descripción o Lema Deportivo
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Grupo de fútbol y asados de los jueves por la noche..."
            className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 space-y-1">
          <p className="font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-neutral-950 dark:text-white">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Configuración Automática
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 font-sans leading-relaxed">
            Al crear el club serás automáticamente el <strong>Administrador Principal</strong>.
            Podrás convocar partidos, aprobar socios y definir datos bancarios de tesorería.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !slug.trim()}
          className="btn-tactile w-full min-h-[48px] py-3.5 px-4 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 text-white font-display font-bold text-xs uppercase tracking-wider shadow-tactile transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          style={{
            backgroundColor: activePalette.primary,
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creando club...</span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 stroke-[2.5]" />
              <span>Confirmar y Fundar Club</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
