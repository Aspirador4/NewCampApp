'use client'

import { Database, Json } from '@/types/database.types'

type FieldDefinition = Database['public']['Tables']['profile_field_definitions']['Row']

interface DynamicProfileFieldsProps {
  definitions: FieldDefinition[]
  values: Record<string, Json>
  onChange: (key: string, value: Json) => void
}

export function DynamicProfileFields({
  definitions,
  values,
  onChange,
}: DynamicProfileFieldsProps) {
  if (!definitions || definitions.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="border-t border-neutral-200 pt-4">
        <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3">
          Datos Deportivos Adicionales
        </h3>

        <div className="space-y-3.5">
          {definitions.map((def) => {
            const rawValue = values[def.field_key]
            const stringValue = rawValue !== undefined && rawValue !== null ? String(rawValue) : ''

            return (
              <div key={def.id} className="space-y-1.5">
                <label
                  htmlFor={`dynamic-${def.field_key}`}
                  className="block text-xs font-semibold text-neutral-700"
                >
                  {def.label}
                  {def.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {/* SELECT field */}
                {def.field_type === 'select' && (
                  <select
                    id={`dynamic-${def.field_key}`}
                    value={stringValue}
                    required={def.is_required}
                    onChange={(e) => onChange(def.field_key, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
                  >
                    <option value="">Selecciona una opción</option>
                    {Array.isArray(def.options) &&
                      def.options.map((opt, idx) => {
                        const optVal = String(opt)
                        return (
                          <option key={`${optVal}-${idx}`} value={optVal}>
                            {optVal}
                          </option>
                        )
                      })}
                  </select>
                )}

                {/* NUMBER field */}
                {def.field_type === 'number' && (
                  <input
                    id={`dynamic-${def.field_key}`}
                    type="number"
                    value={stringValue}
                    required={def.is_required}
                    onChange={(e) =>
                      onChange(def.field_key, e.target.value === '' ? null : Number(e.target.value))
                    }
                    placeholder={`Ingresa ${def.label.toLowerCase()}`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
                  />
                )}

                {/* BOOLEAN field */}
                {def.field_type === 'boolean' && (
                  <label className="flex items-center gap-3 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      id={`dynamic-${def.field_key}`}
                      checked={Boolean(rawValue)}
                      onChange={(e) => onChange(def.field_key, e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300"
                    />
                    <span className="text-xs text-neutral-600">Habilitar / Sí</span>
                  </label>
                )}

                {/* TEXT field */}
                {def.field_type === 'text' && (
                  <input
                    id={`dynamic-${def.field_key}`}
                    type="text"
                    value={stringValue}
                    required={def.is_required}
                    onChange={(e) => onChange(def.field_key, e.target.value)}
                    placeholder={`Ingresa ${def.label.toLowerCase()}`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
