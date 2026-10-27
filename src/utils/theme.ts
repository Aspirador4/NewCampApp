import { Club } from '@/types/club.types'

export interface ClubThemePalette {
  id: string
  name: string
  description: string
  primary: string        // Main branding color
  primaryHover: string   // Hover/active state
  primaryLight: string   // Light background tint (50)
  primaryBorder: string  // Border tint (200)
  primaryText: string    // Text on primary button
  gradientFrom: string   // Badge / hero gradient start
  gradientTo: string     // Badge / hero gradient end
  previewHex: string     // Color swatch display
}

export const CLUB_THEME_PALETTES: ClubThemePalette[] = [
  {
    id: 'granate-oro',
    name: 'Granate & Oro',
    description: 'Identidad oficial del escudo Campana, nobleza granate con acento dorado.',
    primary: '#7b2d32',
    primaryHover: '#632327',
    primaryLight: '#fbf6ee',
    primaryBorder: '#f3cf97',
    primaryText: '#ffffff',
    gradientFrom: '#7b2d32',
    gradientTo: '#e7ab57',
    previewHex: '#7b2d32',
  },
  {
    id: 'emerald',
    name: 'Verde Cancha',
    description: 'Verde esmeralda clásico deportivo, fresco y equilibrado.',
    primary: '#059669',       // emerald-600
    primaryHover: '#047857',  // emerald-700
    primaryLight: '#ecfdf5',  // emerald-50
    primaryBorder: '#a7f3d0', // emerald-200
    primaryText: '#ffffff',
    gradientFrom: '#059669',
    gradientTo: '#0f766e',
    previewHex: '#059669',
  },
  {
    id: 'navy',
    name: 'Azul Marino',
    description: 'Elegancia institucional y sobria, estilo club tradicional.',
    primary: '#1d4ed8',       // blue-700
    primaryHover: '#1e40af',  // blue-800
    primaryLight: '#eff6ff',  // blue-50
    primaryBorder: '#bfdbfe', // blue-200
    primaryText: '#ffffff',
    gradientFrom: '#1e3a8a',
    gradientTo: '#2563eb',
    previewHex: '#1e3a8a',
  },
  {
    id: 'royal',
    name: 'Azul Real',
    description: 'Vibrante, competitivo y enérgico, de alta visibilidad.',
    primary: '#2563eb',       // blue-600
    primaryHover: '#1d4ed8',  // blue-700
    primaryLight: '#eff6ff',  // blue-50
    primaryBorder: '#bfdbfe', // blue-200
    primaryText: '#ffffff',
    gradientFrom: '#2563eb',
    gradientTo: '#3b82f6',
    previewHex: '#2563eb',
  },
  {
    id: 'crimson',
    name: 'Rojo Carmesí',
    description: 'Pasión, garra y fuerza competitiva de alta intensidad.',
    primary: '#dc2626',       // red-600
    primaryHover: '#b91c1c',  // red-700
    primaryLight: '#fef2f2',  // red-50
    primaryBorder: '#fecaca', // red-200
    primaryText: '#ffffff',
    gradientFrom: '#dc2626',
    gradientTo: '#991b1b',
    previewHex: '#dc2626',
  },
  {
    id: 'bordeaux',
    name: 'Vino Tinto / Bordó',
    description: 'Distinguido y prestigioso, tono vinotinto de gala.',
    primary: '#9f1239',       // rose-800
    primaryHover: '#881337',  // rose-900
    primaryLight: '#fff1f2',  // rose-50
    primaryBorder: '#fecdd3', // rose-200
    primaryText: '#ffffff',
    gradientFrom: '#881337',
    gradientTo: '#be123c',
    previewHex: '#881337',
  },
  {
    id: 'amber',
    name: 'Dorado / Ámbar',
    description: 'Dorado brillante, espíritu de campeón y trofeos.',
    primary: '#d97706',       // amber-600
    primaryHover: '#b45309',  // amber-700
    primaryLight: '#fffbeb',  // amber-50
    primaryBorder: '#fde68a', // amber-200
    primaryText: '#ffffff',
    gradientFrom: '#d97706',
    gradientTo: '#b45309',
    previewHex: '#d97706',
  },
  {
    id: 'orange',
    name: 'Naranja Fuego',
    description: 'Moderno, rápido y dinámico, ideal para escuadras ágiles.',
    primary: '#ea580c',       // orange-600
    primaryHover: '#c2410c',  // orange-700
    primaryLight: '#fff7ed',  // orange-50
    primaryBorder: '#fed7aa', // orange-200
    primaryText: '#ffffff',
    gradientFrom: '#ea580c',
    gradientTo: '#c2410c',
    previewHex: '#ea580c',
  },
  {
    id: 'teal',
    name: 'Turquesa / Teal',
    description: 'Fresco, técnico e innovador con toque marítimo.',
    primary: '#0d9488',       // teal-600
    primaryHover: '#0f766e',  // teal-700
    primaryLight: '#f0fdfa',  // teal-50
    primaryBorder: '#99f6e4', // teal-200
    primaryText: '#ffffff',
    gradientFrom: '#0d9488',
    gradientTo: '#115e59',
    previewHex: '#0d9488',
  },
  {
    id: 'violet',
    name: 'Púrpura / Violeta',
    description: 'Identidad única, creativa y audaz sobre el terreno.',
    primary: '#7c3aed',       // violet-600
    primaryHover: '#6d28d9',  // violet-700
    primaryLight: '#f5f3ff',  // violet-50
    primaryBorder: '#ddd6fe', // violet-200
    primaryText: '#ffffff',
    gradientFrom: '#7c3aed',
    gradientTo: '#5b21b6',
    previewHex: '#7c3aed',
  },
  {
    id: 'carbon',
    name: 'Negro Carbón',
    description: 'Monocromo táctico de máxima autoridad y contraste.',
    primary: '#18181b',       // zinc-900
    primaryHover: '#09090b',  // zinc-950
    primaryLight: '#f4f4f5',  // zinc-100
    primaryBorder: '#e4e4e7', // zinc-200
    primaryText: '#ffffff',
    gradientFrom: '#27272a',
    gradientTo: '#09090b',
    previewHex: '#18181b',
  },
]

export const DEFAULT_PALETTE = CLUB_THEME_PALETTES[0] // Emerald

/**
 * Resolves the theme palette for a given club based on its settings.
 */
export function getClubTheme(club?: Club | null): ClubThemePalette {
  if (!club || !club.settings) {
    return DEFAULT_PALETTE
  }

  // 1. Try palette id directly from settings
  const paletteId = (club.settings as { palette?: string })?.palette
  if (paletteId) {
    const found = CLUB_THEME_PALETTES.find((p) => p.id === paletteId)
    if (found) return found
  }

  // 2. Try primary hex from settings.colors.primary
  const customPrimary = club.settings?.colors?.primary
  if (customPrimary) {
    const matched = CLUB_THEME_PALETTES.find(
      (p) => p.primary.toLowerCase() === customPrimary.toLowerCase() || p.id === customPrimary
    )
    if (matched) return matched
  }

  return DEFAULT_PALETTE
}

/**
 * Builds CSS custom properties object for the active club theme.
 */
export function getClubThemeCssVariables(palette: ClubThemePalette): Record<string, string> {
  return {
    '--club-primary': palette.primary,
    '--club-primary-hover': palette.primaryHover,
    '--club-primary-light': palette.primaryLight,
    '--club-primary-border': palette.primaryBorder,
    '--club-primary-text': palette.primaryText,
    '--club-gradient-from': palette.gradientFrom,
    '--club-gradient-to': palette.gradientTo,
  }
}
