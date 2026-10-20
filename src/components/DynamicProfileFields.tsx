'use client'

import { Database, Json } from '@/types/database.types'
import { Check, X, Plus } from 'lucide-react'

type FieldDefinition = Database['public']['Tables']['profile_field_definitions']['Row']

interface DynamicProfileFieldsProps {
  definitions: FieldDefinition[]
  values: Record<string, Json>
  onChange?: (key: string, value: Json) => void
  readOnly?: boolean
}

export function DynamicProfileFields({
  definitions,
  values,
  onChange,
  readOnly = false,
}: DynamicProfileFieldsProps) {
  if (!definitions || definitions.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="border-t border-neutral-200/80 pt-4">
        <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3">
          Datos Deportivos Adicionales
        </h3>

        <div className="space-y-3.5">
          {definitions.map((def) => {
            const rawValue = values[def.field_key]
            const stringValue = rawValue !== undefined && rawValue !== null ? String(rawValue) : ''

            // Parse multiselect values (array of strings, or legacy string)
            const selectedList: string[] = Array.isArray(rawValue)
              ? (rawValue as string[]).map(String)
              : typeof rawValue === 'string' && rawValue.trim().length > 0
              ? [rawValue.trim()]
              : []

            const optionsList: string[] = Array.isArray(def.options)
              ? (def.options as string[]).map(String)
              : []

            // READ-ONLY VIEW
            if (readOnly) {
              return (
                <div key={def.id} className="py-1 border-b border-neutral-100 last:border-b-0 pb-2">
                  <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                    {def.label}
                  </span>

                  {def.field_type === 'multiselect' ? (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedList.length > 0 ? (
                        selectedList.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            ⚽ {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-400 italic">No especificada</span>
                      )}
                    </div>
                  ) : def.field_type === 'boolean' ? (
                    <span className="text-sm font-medium text-neutral-800 mt-0.5 block">
                      {Boolean(rawValue) ? 'Sí' : 'No'}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-neutral-800 mt-0.5 block">
                      {stringValue || <span className="text-neutral-400 italic">No especificado</span>}
                    </span>
                  )}
                </div>
              )
            }

            // EDIT VIEW
            return (
              <div key={def.id} className="space-y-1.5">
                <label
                  htmlFor={`dynamic-${def.field_key}`}
                  className="block text-xs font-semibold text-neutral-700"
                >
                  {def.label}
                  {def.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {/* MULTISELECT COMBO BOX */}
                {def.field_type === 'multiselect' && (
                  <div className="space-y-2">
                    {/* Interactive Toggle Pills / Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {optionsList.map((opt) => {
                        const isSelected = selectedList.includes(opt)
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              if (!onChange) return
                              const updated = isSelected
                                ? selectedList.filter((x) => x !== opt)
                                : [...selectedList, opt]
                              onChange(def.field_key, updated as unknown as Json)
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-neutral-400" />
                            )}
                            <span>{opt}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Active Selected Badges Summary (with clear option) */}
                    {selectedList.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 pt-1">
                        <span>Seleccionadas ({selectedList.length}):</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedList.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[11px] font-medium"
                            >
                              {item}
                              <button
                                type="button"
                                onClick={() => {
                                  if (!onChange) return
                                  onChange(
                                    def.field_key,
                                    selectedList.filter((x) => x !== item) as unknown as Json
                                  )
                                }}
                                className="hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SELECT single field */}
                {def.field_type === 'select' && (
                  <select
                    id={`dynamic-${def.field_key}`}
                    value={stringValue}
                    required={def.is_required}
                    onChange={(e) => onChange && onChange(def.field_key, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
                  >
                    <option value="">Selecciona una opción</option>
                    {optionsList.map((optVal, idx) => (
                      <option key={`${optVal}-${idx}`} value={optVal}>
                        {optVal}
                      </option>
                    ))}
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
                      onChange &&
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
                      onChange={(e) => onChange && onChange(def.field_key, e.target.checked)}
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
                    onChange={(e) => onChange && onChange(def.field_key, e.target.value)}
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
