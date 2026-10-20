'use client'

import { useState } from 'react'
import { createEvent } from '@/app/eventos/actions'
import { MapPin, Users, Check, Loader2, AlertCircle } from 'lucide-react'

export function CreateEventForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const res = await createEvent(formData)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-xs font-semibold text-neutral-700 mb-1">
          Título del Evento <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Ej: Partido Fútbol 7 - Cancha 1"
          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
        />
      </div>

      {/* Event Type */}
      <div>
        <label htmlFor="event_type" className="block text-xs font-semibold text-neutral-700 mb-1">
          Tipo de Evento <span className="text-red-500">*</span>
        </label>
        <select
          id="event_type"
          name="event_type"
          required
          defaultValue="partido"
          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
        >
          <option value="partido">⚽ Partido</option>
          <option value="entrenamiento">🏃 Entrenamiento</option>
          <option value="torneo">🏆 Torneo</option>
          <option value="asado">🥩 Asado / Social</option>
          <option value="otro">📌 Otro</option>
        </select>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start_date" className="block text-xs font-semibold text-neutral-700 mb-1">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="start_time" className="block text-xs font-semibold text-neutral-700 mb-1">
            Hora de Inicio <span className="text-red-500">*</span>
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-xs font-semibold text-neutral-700 mb-1">
          Lugar / Dirección <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <MapPin className="w-4 h-4" />
          </div>
          <input
            id="location"
            name="location"
            type="text"
            required
            placeholder="Ej: Complejo Los Álamos - Cancha 3"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
          />
        </div>
      </div>

      {/* Max Capacity */}
      <div>
        <label htmlFor="max_capacity" className="block text-xs font-semibold text-neutral-700 mb-1">
          Cupo Máximo de Jugadores
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Users className="w-4 h-4" />
          </div>
          <input
            id="max_capacity"
            name="max_capacity"
            type="number"
            min="2"
            max="100"
            placeholder="Ej: 14 (dejar vacío si no tiene límite)"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
          />
        </div>
        <p className="text-[11px] text-neutral-400 mt-1">
          Al llenarse este cupo, las siguientes confirmaciones pasan automáticamente a lista de espera.
        </p>
      </div>

      {/* Description / Cost notes */}
      <div>
        <label htmlFor="description" className="block text-xs font-semibold text-neutral-700 mb-1">
          Detalles & Costo (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Ej: Valor $3.500 c/u. Canilleras obligatorias. Camiseta blanca o negra."
          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Publicar Convocatoria</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
