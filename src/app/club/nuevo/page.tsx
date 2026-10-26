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
    <div className="flex-1 flex flex-col p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-2 pb-5 border-b border-neutral-200">
        <Link
          href="/"
          className="p-2.5 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Crear Nuevo Club</h1>
          <p className="text-xs text-neutral-500">
            Administra tus propios partidos, miembros y finanzas independientes
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Brand Preview Card */}
      <div className="mt-5 p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs flex items-center gap-3.5">
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center text-white font-extrabold text-base shadow-md flex-shrink-0 transition-colors"
          style={{
            background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Vista previa"
              className="w-full h-full object-cover rounded-2xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            clubInitials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Vista previa de identidad
          </p>
          <h3 className="font-bold text-neutral-900 text-base truncate">
            {name.trim() || 'Nombre de tu Club'}
          </h3>
          <p className="text-xs text-neutral-500 truncate">
            {slug.trim() ? `/club/unirse/${slug}` : '/club/unirse/...'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Nombre del Club *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej: Los Pioneros FC"
            className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-base sm:text-sm font-medium transition"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Identificador Único (Slug) *
            </label>
            <span className="text-[11px] text-neutral-400">
              Para enlaces de invitación
            </span>
          </div>
          <div className="flex items-center rounded-xl border border-neutral-300 overflow-hidden focus-within:ring-2 focus-within:ring-neutral-900 focus-within:border-neutral-900 bg-neutral-50">
            <span className="px-3 text-xs text-neutral-500 font-mono select-none">
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
              className="w-full py-3 pr-3 bg-transparent text-base sm:text-sm font-mono text-neutral-800 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-neutral-500">
            Tus miembros podrán solicitar unirse mediante este enlace.
          </p>
        </div>

        {/* 10 Color Palettes Picker */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-neutral-500" />
              Paleta de Colores del Club (10 Estilos)
            </label>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: activePalette.primaryLight,
                color: activePalette.primary,
              }}
            >
              {activePalette.name}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Define la personalidad visual del club: botones primarios, medallas y navegación.
          </p>
          <PalettePicker
            selectedId={paletteId}
            onSelect={(id) => setPaletteId(id)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Descripción o Lema
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Grupo de fútbol y asados de los jueves por la noche..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-base sm:text-sm transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            URL del Escudo / Logo (Opcional)
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://ejemplo.com/logo.png"
            className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-base sm:text-sm transition"
          />
        </div>

        <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-800 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-neutral-900">
            <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
            Configuración Automática
          </p>
          <p className="text-neutral-600">
            Al crear el club serás automáticamente el <strong>Administrador Principal</strong>.
            Podrás convocar partidos, aprobar socios y definir datos bancarios de tesorería.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !slug.trim()}
          className="w-full min-h-[48px] py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          style={{
            backgroundColor: activePalette.primary,
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creando club...
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4" />
              Confirmar y Crear Club
            </>
          )}
        </button>
      </form>
    </div>
  )
}
