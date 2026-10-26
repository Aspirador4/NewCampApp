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
      <div className="border-t-2 border-neutral-900/10 pt-4">
        <h3 className="font-display font-black text-xs text-neutral-900 uppercase tracking-wider mb-3">
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
                <div key={def.id} className="py-2 border-b border-neutral-200/80 last:border-b-0 pb-2">
                  <span className="block font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    {def.label}
                  </span>

                  {def.field_type === 'multiselect' ? (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedList.length > 0 ? (
                        selectedList.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-display font-black uppercase tracking-wider border border-neutral-300"
                            style={{
                              backgroundColor: 'var(--club-primary-light, #ecfdf5)',
                              color: 'var(--club-primary, #059669)',
                            }}
                          >
                            ⚽ {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-400 italic">No especificada</span>
                      )}
                    </div>
                  ) : def.field_type === 'boolean' ? (
                    <span className="text-sm font-bold text-neutral-900 mt-0.5 block">
                      {Boolean(rawValue) ? 'Sí' : 'No'}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-neutral-900 mt-0.5 block">
                      {stringValue || <span className="text-neutral-400 italic font-normal">No especificado</span>}
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
                  className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900"
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
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-display font-black uppercase tracking-wider border-2 transition flex items-center gap-1.5 active:scale-95 ${
                              isSelected
                                ? 'text-white border-neutral-900 shadow-tactile-sm'
                                : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-900'
                            }`}
                            style={
                              isSelected
                                ? { backgroundColor: 'var(--club-primary, #059669)' }
                                : undefined
                            }
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 text-neutral-400" />}
                            <span>{opt}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Summary tags of selected items */}
                    {selectedList.length > 0 && (
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Seleccionadas:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedList.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-display font-black uppercase border border-neutral-300"
                              style={{
                                backgroundColor: 'var(--club-primary-light, #ecfdf5)',
                                color: 'var(--club-primary, #059669)',
                              }}
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
                                className="hover:text-red-600 p-0.5"
                                aria-label={`Remover ${item}`}
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
                    className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium"
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
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={stringValue}
                    required={def.is_required}
                    onChange={(e) =>
                      onChange &&
                      onChange(def.field_key, e.target.value === '' ? null : Number(e.target.value))
                    }
                    placeholder={`Ingresa ${def.label.toLowerCase()}`}
                    className="input-tactile w-full px-3.5 py-2.5 text-xs font-mono font-medium"
                  />
                )}

                {/* BOOLEAN field */}
                {def.field_type === 'boolean' && (
                  <label className="flex items-center gap-3 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      id={`dynamic-${def.field_key}`}
                      checked={Boolean(rawValue)}
                      onChange={(e) => onChange && onChange(def.field_key, e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-neutral-900 text-neutral-900 focus:ring-0"
                    />
                    <span className="font-display font-black text-xs uppercase tracking-wider text-neutral-900">Habilitar / Sí</span>
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
                    className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium"
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
