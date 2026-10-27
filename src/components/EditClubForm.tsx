'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Shield,
  Palette,
  UploadCloud,
  Link2,
  Trash2,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  Sparkles,
} from 'lucide-react'
import { updateClubAction, uploadClubLogoAction } from '@/app/club/actions'
import { PalettePicker } from '@/components/PalettePicker'
import { CLUB_THEME_PALETTES, ClubThemePalette } from '@/utils/theme'
import type { Club } from '@/types/club.types'

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

interface EditClubFormProps {
  club: Club
}

export function EditClubForm({ club }: EditClubFormProps) {
  const router = useRouter()
  const initialPalette = (club.settings?.palette as string) || 'emerald'

  const [activeTab, setActiveTab] = useState<'identidad' | 'colores'>('identidad')
  const [name, setName] = useState(club.name)
  const [slug, setSlug] = useState(club.slug)
  const [description, setDescription] = useState(club.description || '')
  const [logoUrl, setLogoUrl] = useState(club.logo_url || '')
  const [paletteId, setPaletteId] = useState(initialPalette)
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const activePalette: ClubThemePalette =
    CLUB_THEME_PALETTES.find((p) => p.id === paletteId) || CLUB_THEME_PALETTES[0]

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
    setSuccessMsg(null)
    setSaving(true)

    const formData = new FormData()
    formData.append('club_id', club.id)
    formData.append('name', name)
    formData.append('slug', slug)
    formData.append('description', description)
    formData.append('logo_url', logoUrl)
    formData.append('palette_id', paletteId)

    const res = await updateClubAction(formData)
    setSaving(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccessMsg('¡Datos e identidad del club actualizados exitosamente!')
      router.refresh()
      setTimeout(() => {
        setSuccessMsg(null)
      }, 4000)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b-2 border-neutral-900/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 -ml-1 rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-2xl text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
              Editar Club
            </h1>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
              Identidad, Escudo y Colores Oficiales
            </p>
          </div>
        </div>

        <div
          className="w-10 h-10 rounded-xl text-white flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm"
          style={{
            background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
          }}
        >
          <Shield className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>

      {/* Alert Feedback */}
      {error && (
        <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs border-2 border-rose-300 dark:border-rose-800 shadow-tactile-sm font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 text-xs border-2 border-emerald-300 dark:border-emerald-800 shadow-tactile-sm font-semibold">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Live Brand Preview Card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-950 text-white shadow-tactile p-4">
        <div className="absolute inset-0 bg-mesh-pattern-white opacity-10 pointer-events-none" />
        <div
          className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl opacity-40 pointer-events-none transition-colors duration-300"
          style={{ backgroundColor: activePalette.primary }}
        />

        <div className="relative flex items-center justify-between pb-3 border-b border-white/10 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold uppercase tracking-widest text-emerald-400">
              VISTA PREVIA EN VIVO
            </span>
          </div>
          <span className="uppercase text-neutral-400 tracking-wider">
            /{slug || club.slug}
          </span>
        </div>

        <div className="relative pt-3 flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl border-2 border-white/20 flex items-center justify-center text-white shadow-md flex-shrink-0 overflow-hidden transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Escudo del club"
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <span className="font-display font-bold text-xl uppercase tracking-tighter">
                {name.slice(0, 2).toUpperCase() || 'CP'}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-xl uppercase tracking-tight text-white truncate leading-tight">
              {name || 'Nombre del Club'}
            </h2>
            <p className="text-xs text-neutral-300 font-sans line-clamp-1 mt-0.5">
              {description || 'Lema o descripción oficial del club'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-white/20 inline-flex items-center gap-1"
                style={{ backgroundColor: activePalette.primary }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {activePalette.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Tabs: Identidad vs Colores */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('identidad')}
          className={`btn-tactile py-2.5 px-3 rounded-xl text-center flex items-center justify-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 transition ${
            activeTab === 'identidad'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <Shield className="w-4 h-4 stroke-[2.5]" />
          <span>Identidad & Escudo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colores')}
          className={`btn-tactile py-2.5 px-3 rounded-xl text-center flex items-center justify-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 transition ${
            activeTab === 'colores'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <Palette className="w-4 h-4 stroke-[2.5]" />
          <span>Colores del Club</span>
        </button>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {activeTab === 'identidad' && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile space-y-4 animate-in fade-in duration-150">
            {/* Club Name */}
            <div>
              <label className="block font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">
                Nombre Oficial del Club *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Deportivo Huracán"
                className="input-tactile w-full px-3.5 py-2.5 text-sm font-semibold"
              />
            </div>

            {/* Club Slug */}
            <div>
              <label className="block font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">
                Identificador de URL (Slug)
              </label>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-2.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700">
                  /club/unirse/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                  placeholder="deportivo-huracan"
                  className="input-tactile flex-1 px-3 py-2.5 text-xs font-mono font-medium"
                />
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                Este código se usa en los links de invitación que compartes con tus jugadores.
              </p>
            </div>

            {/* Description / Motto */}
            <div>
              <label className="block font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">
                Lema o Descripción
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Fundado en 2021. Fútbol, amistad y tercer tiempo cada martes."
                className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium resize-none"
              />
            </div>

            {/* Escudo / Logo Section */}
            <div className="pt-2 border-t-2 border-neutral-900/10 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    Escudo / Logo del Club
                  </label>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Puedes cargar un archivo de tu dispositivo o pegar una URL directa.
                  </p>
                </div>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Quitar logo
                  </button>
                )}
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`btn-tactile py-2 px-3 rounded-xl text-center flex items-center justify-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 transition ${
                    logoMode === 'upload'
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Subir Imagen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`btn-tactile py-2 px-3 rounded-xl text-center flex items-center justify-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 transition ${
                    logoMode === 'url'
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Pegar URL</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              {logoMode === 'upload' && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoFileSelect}
                    className="hidden"
                    id="club-logo-input"
                  />

                  <label
                    htmlFor="club-logo-input"
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                      uploadingLogo
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                        : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-400 bg-neutral-50 dark:bg-neutral-800/50'
                    }`}
                  >
                    {uploadingLogo ? (
                      <div className="flex flex-col items-center gap-2 text-amber-700 dark:text-amber-400 py-2">
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="font-display font-bold text-xs uppercase tracking-wider">
                          Comprimiendo y subiendo escudo...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-200 shadow-tactile-sm">
                          <ImageIcon className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="text-center">
                          <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
                            {logoUrl ? 'Cambiar Imagen de Escudo' : 'Seleccionar Archivo de Imagen'}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            PNG, JPG, WebP o SVG (Máx. 5MB)
                          </p>
                        </div>
                      </>
                    )}
                  </label>

                  {uploadError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {uploadError}
                    </p>
                  )}
                </div>
              )}

              {/* URL Input */}
              {logoMode === 'url' && (
                <div>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value.trim())}
                    placeholder="https://ejemplo.com/escudo.png"
                    className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium font-mono"
                  />
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Ingresa el link directo a la imagen del escudo.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'colores' && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile space-y-4 animate-in fade-in duration-150">
            <div>
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-950 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-600" />
                Paleta Institucional (10 Colores Oficiales)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-sans">
                La paleta seleccionada se aplica en toda la app para los socios del club: carnet oficial, botones táctiles principales, dorsales y barra de navegación.
              </p>
            </div>

            <PalettePicker
              selectedId={paletteId}
              onSelect={(id) => setPaletteId(id)}
              disabled={saving}
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || uploadingLogo}
            className="btn-tactile w-full min-h-[48px] py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-neutral-950 font-display font-bold text-sm uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando Cambios...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Cambios del Club</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
