'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Sparkles, AlertCircle, Loader2, Palette } from 'lucide-react'
import { createClubAction } from '@/app/club/actions'
import { PalettePicker } from '@/components/PalettePicker'
import { CLUB_THEME_PALETTES } from '@/utils/theme'

export default function NuevoClubPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [paletteId, setPaletteId] = useState('emerald')
  const [isManualSlug, setIsManualSlug] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          <h1 className="font-display font-black text-2xl uppercase tracking-tight text-neutral-950 dark:text-white leading-none">
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
          className="w-14 h-14 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-center text-white font-display font-black text-lg flex-shrink-0 transition-colors overflow-hidden"
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
          <p className="font-mono text-[9px] font-black text-neutral-400 uppercase tracking-widest">
            Vista Previa de Escudo
          </p>
          <h3 className="font-display font-black text-xl uppercase tracking-tight text-neutral-950 dark:text-white truncate">
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
          <label className="font-display font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
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
            <label className="font-display font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
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
            <label className="font-display font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 stroke-[2.5]" />
              Color Institucional (10 Paletas Oficiales)
            </label>
            <span
              className="font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700"
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

        <div className="space-y-1.5">
          <label className="font-display font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
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

        <div className="space-y-1.5">
          <label className="font-display font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
            URL del Escudo / Logo (Opcional)
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://ejemplo.com/logo.png"
            className="input-tactile w-full px-3.5 py-2.5 text-xs font-mono font-medium placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 space-y-1">
          <p className="font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-neutral-950 dark:text-white">
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
          className="btn-tactile w-full min-h-[48px] py-3.5 px-4 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 text-white font-display font-black text-xs uppercase tracking-wider shadow-tactile transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
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
