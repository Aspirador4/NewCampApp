'use client'

import { useState } from 'react'
import { createEvent } from '@/app/eventos/actions'
import { MapPin, Users, Check, Loader2, AlertCircle, CircleDollarSign, Plus, Trash2 } from 'lucide-react'

export function CreateEventForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventType, setEventType] = useState<'partido' | 'entrenamiento' | 'otro'>('partido')

  // Cost and capacity states
  const [maxCapacity, setMaxCapacity] = useState<number | ''>(14)
  const [totalCost, setTotalCost] = useState<number | ''>(42000)

  // Training cost mode: 'prorrateo' | 'fijo' | 'gratis'
  const [trainingBillingMode, setTrainingBillingMode] = useState<'prorrateo' | 'fijo' | 'gratis'>('prorrateo')
  const [fixedCostPerPlayer, setFixedCostPerPlayer] = useState<number | ''>(3000)

  // Dynamic custom fields for 'otro' (Asado, Junta, Directorio, etc.)
  const [customFields, setCustomFields] = useState<{ id: string; label: string; value: string }[]>([
    { id: '1', label: 'Concepto', value: 'Asado del club' },
  ])

  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      { id: String(Date.now()), label: '', value: '' },
    ])
  }

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id))
  }

  const updateCustomField = (id: string, key: 'label' | 'value', text: string) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: text } : f))
    )
  }

  const estimatedProrrated =
    typeof totalCost === 'number' && totalCost > 0 && typeof maxCapacity === 'number' && maxCapacity > 0
      ? Math.round(totalCost / maxCapacity)
      : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    // Append custom fields as JSON for 'otro'
    if (eventType === 'otro') {
      const fieldsObj: Record<string, string> = {}
      for (const f of customFields) {
        if (f.label.trim()) {
          fieldsObj[f.label.trim()] = f.value.trim()
        }
      }
      formData.append('custom_fields', JSON.stringify(fieldsObj))
    }

    // Set billing for training
    if (eventType === 'entrenamiento') {
      if (trainingBillingMode === 'fijo') {
        formData.set('total_cost', '')
        formData.set('cost_per_player', String(fixedCostPerPlayer || 0))
      } else if (trainingBillingMode === 'gratis') {
        formData.set('total_cost', '0')
        formData.set('cost_per_player', '0')
      }
    }

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
          placeholder={
            eventType === 'partido'
              ? 'Ej: Partido Fútbol 7 - Cancha 1'
              : eventType === 'entrenamiento'
              ? 'Ej: Entrenamiento Físico & Táctico'
              : 'Ej: Asado de Fin de Mes / Junta de Directorio'
          }
          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
        />
      </div>

      {/* Event Type: Only partido, entrenamiento, otro */}
      <div>
        <label htmlFor="event_type" className="block text-xs font-semibold text-neutral-700 mb-1">
          Tipo de Evento <span className="text-red-500">*</span>
        </label>
        <select
          id="event_type"
          name="event_type"
          required
          value={eventType}
          onChange={(e) => setEventType(e.target.value as 'partido' | 'entrenamiento' | 'otro')}
          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 font-medium"
        >
          <option value="partido">⚽ Partido</option>
          <option value="entrenamiento">🏃 Entrenamiento</option>
          <option value="otro">📌 Otro (Asado, Junta, Directorio, etc.)</option>
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
            placeholder="Ej: Complejo Pasco Club - Cancha 3"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
          />
        </div>
      </div>

      {/* Max Capacity */}
      <div>
        <label htmlFor="max_capacity" className="block text-xs font-semibold text-neutral-700 mb-1">
          {eventType === 'otro' ? 'Cupo / Asistentes esperados' : 'Cupo Máximo de Jugadores'}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Users className="w-4 h-4" />
          </div>
          <input
            id="max_capacity"
            name="max_capacity"
            type="number"
            min="1"
            max="150"
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            placeholder="Ej: 14 (dejar vacío si no tiene límite)"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
          />
        </div>
        <p className="text-[11px] text-neutral-400 mt-1">
          Al completarse, las siguientes confirmaciones pasan a lista de espera.
        </p>
      </div>

      {/* Billing Configuration for PARTIDO */}
      {eventType === 'partido' && (
        <div>
          <label htmlFor="total_cost" className="block text-xs font-semibold text-neutral-700 mb-1">
            Costo Total de la Cancha ($)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <CircleDollarSign className="w-4 h-4" />
            </div>
            <input
              id="total_cost"
              name="total_cost"
              type="number"
              min="0"
              step="1000"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              placeholder="Ej: 42000"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
            />
          </div>
          {estimatedProrrated !== null ? (
            <p className="text-[11px] text-emerald-800 font-medium mt-1 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              Prorrateo estimado por jugador: <strong className="font-bold text-emerald-950">${estimatedProrrated.toLocaleString('es-CL')}</strong> (Total cancha ${Number(totalCost).toLocaleString('es-CL')} ÷ {maxCapacity} convocados).
            </p>
          ) : (
            <p className="text-[11px] text-neutral-400 mt-1">
              El cobro se prorratea automáticamente dividiendo este total entre todos los convocados.
            </p>
          )}
        </div>
      )}

      {/* Billing Configuration for ENTRENAMIENTO */}
      {eventType === 'entrenamiento' && (
        <div className="space-y-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200">
          <label className="block text-xs font-bold text-neutral-800">
            Modalidad de Cobro del Entrenamiento
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTrainingBillingMode('prorrateo')}
              className={`p-2 rounded-xl font-bold transition text-center ${
                trainingBillingMode === 'prorrateo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Cancha Total
            </button>
            <button
              type="button"
              onClick={() => setTrainingBillingMode('fijo')}
              className={`p-2 rounded-xl font-bold transition text-center ${
                trainingBillingMode === 'fijo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Fijo x Jugador
            </button>
            <button
              type="button"
              onClick={() => setTrainingBillingMode('gratis')}
              className={`p-2 rounded-xl font-bold transition text-center ${
                trainingBillingMode === 'gratis'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Gratis ($0)
            </button>
          </div>

          {trainingBillingMode === 'prorrateo' && (
            <div>
              <label htmlFor="total_cost" className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Costo Total de la Cancha ($)
              </label>
              <input
                id="total_cost"
                name="total_cost"
                type="number"
                min="0"
                step="1000"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="Ej: 35000"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm bg-white"
              />
              {estimatedProrrated !== null && (
                <p className="text-[11px] text-emerald-800 font-medium mt-1">
                  Prorrateo estimado: ${estimatedProrrated.toLocaleString('es-CL')} por jugador.
                </p>
              )}
            </div>
          )}

          {trainingBillingMode === 'fijo' && (
            <div>
              <label htmlFor="cost_per_player" className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Cuota Fija por Jugador ($)
              </label>
              <input
                id="cost_per_player"
                name="cost_per_player"
                type="number"
                min="0"
                step="500"
                value={fixedCostPerPlayer}
                onChange={(e) => setFixedCostPerPlayer(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="Ej: 3000"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Mutable Custom Fields for OTRO */}
      {eventType === 'otro' && (
        <div className="space-y-2.5 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-neutral-900">Campos Personalizados (Mutable)</h4>
              <p className="text-[10px] text-neutral-500">Agrega cualquier detalle: qué traer, cuota, temas a tratar, etc.</p>
            </div>
            <button
              type="button"
              onClick={addCustomField}
              className="text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 py-1 px-2.5 rounded-lg flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {customFields.map((field) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Etiqueta (ej: Cuota)"
                  value={field.label}
                  onChange={(e) => updateCustomField(field.id, 'label', e.target.value)}
                  className="w-1/3 px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs bg-white font-medium"
                />
                <input
                  type="text"
                  placeholder="Detalle (ej: $5.000 por persona)"
                  value={field.value}
                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeCustomField(field.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description / Additional notes */}
      <div>
        <label htmlFor="description" className="block text-xs font-semibold text-neutral-700 mb-1">
          Descripción o Instrucciones Generales (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Ej: Llevar camiseta clara y oscura. Llegar 15 minutos antes para calentar."
          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
        />
      </div>

      {/* Notice for non-admin creators */}
      <p className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
        ℹ️ Si eres socio, la convocatoria quedará en revisión para aprobación de los administradores antes de publicarse a los miembros.
      </p>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Publicando Evento...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>Publicar Convocatoria</span>
          </>
        )}
      </button>
    </form>
  )
}
