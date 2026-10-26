'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import { createClubAction } from '@/app/club/actions'

export default function NuevoClubPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [isManualSlug, setIsManualSlug] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (logoUrl) formData.append('logo_url', logoUrl)

    const res = await createClubAction(formData)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-5 pb-28">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-2 pb-5 border-b border-neutral-200">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
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
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

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
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
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
          <div className="flex items-center rounded-xl border border-neutral-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 bg-neutral-50">
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
              className="w-full py-2.5 pr-3 bg-transparent text-sm font-mono text-neutral-800 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-neutral-500">
            Tus miembros podrán solicitar unirse mediante este enlace.
          </p>
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Configuración Automática
          </p>
          <p className="text-emerald-700">
            Al crear el club serás automáticamente el <strong>Administrador Principal</strong>.
            Podrás invitar socios, convocar eventos y definir los datos de transferencia bancaria.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !slug.trim()}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
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
