'use client'

import { Check } from 'lucide-react'
import { CLUB_THEME_PALETTES, ClubThemePalette } from '@/utils/theme'

interface PalettePickerProps {
  selectedId: string
  onSelect: (paletteId: string) => void
  disabled?: boolean
}

export function PalettePicker({ selectedId, onSelect, disabled = false }: PalettePickerProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {CLUB_THEME_PALETTES.map((palette: ClubThemePalette) => {
          const isSelected = palette.id === selectedId

          return (
            <button
              key={palette.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(palette.id)}
              className={`p-2.5 rounded-2xl border-2 text-left transition-all duration-150 flex flex-col gap-2 min-h-[76px] relative active:scale-95 ${
                isSelected
                  ? 'border-neutral-900 bg-white shadow-tactile-sm'
                  : 'border-neutral-200 bg-white hover:border-neutral-400'
              } disabled:opacity-50`}
            >
              {/* Color swatch row */}
              <div className="flex items-center justify-between w-full">
                <div
                  className="w-7 h-7 rounded-xl border border-neutral-900 shadow-xs flex items-center justify-center text-white"
                  style={{
                    background: `linear-gradient(135deg, ${palette.gradientFrom}, ${palette.gradientTo})`,
                  }}
                >
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>

                <div
                  className="w-3.5 h-3.5 rounded-full border border-neutral-900"
                  style={{ backgroundColor: palette.primaryLight }}
                />
              </div>

              <div>
                <p className="font-display font-black text-xs uppercase tracking-tight text-neutral-950 leading-tight">
                  {palette.name}
                </p>
                <p className="font-mono text-[9px] text-neutral-500 truncate mt-0.5">
                  {palette.description.split(',')[0]}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
