'use client'

import { useState } from 'react'
import { createEvent } from '@/app/eventos/actions'
import { MapPin, Users, Check, Loader2, AlertCircle, CircleDollarSign, Plus, Trash2 } from 'lucide-react'

export function CreateEventForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventType, setEventType] = useState<'partido' | 'entrenamiento' | 'otro'>('partido')
  const [genderCategory, setGenderCategory] = useState<'mixto' | 'masculino' | 'femenino'>('mixto')

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
        <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
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
          className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium placeholder-neutral-400"
        />
      </div>

      {/* Event Type: Only partido, entrenamiento, otro */}
      <div>
        <label htmlFor="event_type" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
          Tipo de Evento <span className="text-red-500">*</span>
        </label>
        <select
          id="event_type"
          name="event_type"
          required
          value={eventType}
          onChange={(e) => setEventType(e.target.value as 'partido' | 'entrenamiento' | 'otro')}
          className="input-tactile w-full px-3.5 py-2.5 text-xs font-display font-black uppercase tracking-wider"
        >
          <option value="partido">⚽ Partido</option>
          <option value="entrenamiento">🏃 Entrenamiento</option>
          <option value="otro">📌 Otro (Asado, Junta, Directorio, etc.)</option>
        </select>
      </div>

      {/* Gender Category */}
      <div>
        <label className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
          Categoría de Género <span className="text-red-500">*</span>
        </label>
        <input type="hidden" name="gender_category" value={genderCategory} />
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'mixto', label: '👫 Mixto' },
            { value: 'masculino', label: '👨 Masculino' },
            { value: 'femenino', label: '👩 Femenino' },
          ].map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setGenderCategory(cat.value as 'mixto' | 'masculino' | 'femenino')}
              className={`btn-tactile py-2.5 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider border-2 transition text-center ${
                genderCategory === cat.value
                  ? 'border-neutral-900 shadow-tactile-sm text-white'
                  : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-900'
              }`}
              style={
                genderCategory === cat.value
                  ? { backgroundColor: 'var(--club-primary, #059669)' }
                  : undefined
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start_date" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            className="input-tactile w-full px-3 py-2 text-xs font-mono font-medium"
          />
        </div>

        <div>
          <label htmlFor="start_time" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
            Hora de Inicio <span className="text-red-500">*</span>
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            required
            className="input-tactile w-full px-3 py-2 text-xs font-mono font-medium"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
          Lugar / Cancha / Sede <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <MapPin className="w-4 h-4 stroke-[2.5]" />
          </div>
          <input
            id="location"
            name="location"
            type="text"
            required
            placeholder="Ej: Complejo Pasco Club - Cancha 3"
            className="input-tactile w-full pl-10 pr-3.5 py-2.5 text-xs font-medium placeholder-neutral-400"
          />
        </div>
      </div>

      {/* Max Capacity */}
      <div>
        <label htmlFor="max_capacity" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
          {eventType === 'otro' ? 'Cupo / Asistentes esperados' : 'Cupo Máximo de Jugadores'}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Users className="w-4 h-4 stroke-[2.5]" />
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
            className="input-tactile w-full pl-10 pr-3.5 py-2.5 text-xs font-mono font-medium placeholder-neutral-400"
          />
        </div>
        <p className="font-mono text-[10px] text-neutral-400 mt-1 uppercase">
          Al completarse, las siguientes confirmaciones pasan a lista de espera.
        </p>
      </div>

      {/* Billing Configuration for PARTIDO */}
      {eventType === 'partido' && (
        <div className="bg-white border-2 border-neutral-900 shadow-tactile-sm rounded-3xl p-4 space-y-2">
          <label htmlFor="total_cost" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900">
            Costo Total de la Cancha ($)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <CircleDollarSign className="w-4 h-4 stroke-[2.5]" />
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
              className="input-tactile w-full pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold"
            />
          </div>
          {estimatedProrrated !== null ? (
            <p className="text-[11px] text-emerald-950 font-medium bg-emerald-50 p-3 rounded-2xl border-2 border-emerald-300">
              Prorrateo estimado por jugador: <strong className="font-bold text-emerald-950 font-mono">${estimatedProrrated.toLocaleString('es-CL')}</strong> (Total cancha ${Number(totalCost).toLocaleString('es-CL')} ÷ {maxCapacity} convocados).
            </p>
          ) : (
            <p className="font-mono text-[10px] text-neutral-400">
              El cobro se prorratea automáticamente dividiendo este total entre todos los convocados.
            </p>
          )}
        </div>
      )}

      {/* Billing Configuration for ENTRENAMIENTO */}
      {eventType === 'entrenamiento' && (
        <div className="space-y-3 bg-neutral-50 p-4 rounded-3xl border-2 border-neutral-900 shadow-tactile-sm">
          <label className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900">
            Modalidad de Cobro del Entrenamiento
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTrainingBillingMode('prorrateo')}
              className={`btn-tactile p-2 rounded-xl border-2 font-display font-black uppercase tracking-wider transition text-center ${
                trainingBillingMode === 'prorrateo'
                  ? 'border-neutral-900 bg-neutral-950 text-white shadow-tactile-sm'
                  : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-900'
              }`}
            >
              Cancha Total
            </button>
            <button
              type="button"
              onClick={() => setTrainingBillingMode('fijo')}
              className={`btn-tactile p-2 rounded-xl border-2 font-display font-black uppercase tracking-wider transition text-center ${
                trainingBillingMode === 'fijo'
                  ? 'border-neutral-900 bg-neutral-950 text-white shadow-tactile-sm'
                  : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-900'
              }`}
            >
              Fijo x Jugador
            </button>
            <button
              type="button"
              onClick={() => setTrainingBillingMode('gratis')}
              className={`btn-tactile p-2 rounded-xl border-2 font-display font-black uppercase tracking-wider transition text-center ${
                trainingBillingMode === 'gratis'
                  ? 'border-neutral-900 bg-neutral-950 text-white shadow-tactile-sm'
                  : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-900'
              }`}
            >
              Gratis ($0)
            </button>
          </div>

          {trainingBillingMode === 'prorrateo' && (
            <div>
              <label htmlFor="total_cost" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-700 mb-1">
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
                className="input-tactile w-full px-3 py-2 text-xs font-mono font-bold"
              />
              {estimatedProrrated !== null && (
                <p className="font-mono text-[11px] text-emerald-800 font-bold mt-1">
                  Prorrateo estimado: ${estimatedProrrated.toLocaleString('es-CL')} por jugador.
                </p>
              )}
            </div>
          )}

          {trainingBillingMode === 'fijo' && (
            <div>
              <label htmlFor="cost_per_player" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-700 mb-1">
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
                className="input-tactile w-full px-3 py-2 text-xs font-mono font-bold"
              />
            </div>
          )}
        </div>
      )}

      {/* Mutable Custom Fields for OTRO */}
      {eventType === 'otro' && (
        <div className="space-y-2.5 bg-neutral-50 p-4 rounded-3xl border-2 border-neutral-900 shadow-tactile-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display font-black text-xs uppercase tracking-wider text-neutral-950">Campos Personalizados (Mutable)</h4>
              <p className="text-[10px] text-neutral-500 font-sans">Agrega cualquier detalle: qué traer, cuota, temas a tratar, etc.</p>
            </div>
            <button
              type="button"
              onClick={addCustomField}
              className="btn-tactile text-xs font-display font-black uppercase tracking-wider text-neutral-950 bg-white hover:bg-neutral-100 border-2 border-neutral-900 py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-tactile-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
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
                  className="input-tactile w-1/3 px-3 py-1.5 text-xs font-medium"
                />
                <input
                  type="text"
                  placeholder="Detalle (ej: $5.000 por persona)"
                  value={field.value}
                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                  className="input-tactile flex-1 px-3 py-1.5 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => removeCustomField(field.id)}
                  className="p-1.5 text-neutral-400 hover:text-rose-600 transition"
                >
                  <Trash2 className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description / Additional notes */}
      <div>
        <label htmlFor="description" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
          Descripción o Instrucciones Generales (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Ej: Llevar camiseta clara y oscura. Llegar 15 minutos antes para calentar."
          className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium placeholder-neutral-400"
        />
      </div>

      {/* Notice for non-admin creators */}
      <p className="text-[11px] text-neutral-600 bg-neutral-100 p-3 rounded-2xl border border-neutral-300 font-sans">
        ℹ️ Si eres socio, la convocatoria quedará en revisión para aprobación de los capitanes antes de publicarse a los miembros.
      </p>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="btn-tactile w-full min-h-[48px] py-3.5 px-4 rounded-2xl text-white font-display font-black text-base uppercase tracking-wider border-2 border-neutral-900 shadow-tactile flex items-center justify-center gap-2 disabled:opacity-50"
        style={{
          backgroundColor: 'var(--club-primary, #059669)',
        }}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Publicando Convocatoria...</span>
          </>
        ) : (
          <>
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Publicar Convocatoria Oficial</span>
          </>
        )}
      </button>
    </form>
  )
}
