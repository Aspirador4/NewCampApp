'use client'

import { useState } from 'react'
import { updateProfile, signOut } from '@/app/auth/actions'
import { AvatarUpload } from '@/components/AvatarUpload'
import { DynamicProfileFields } from '@/components/DynamicProfileFields'
import { Database, Json, SportsRole } from '@/types/database.types'
import { Loader2, CheckCircle2, AlertCircle, LogOut, Save } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']
type FieldDefinition = Database['public']['Tables']['profile_field_definitions']['Row']

interface ProfileFormProps {
  profile: Profile
  fieldDefinitions: FieldDefinition[]
}

export function ProfileForm({ profile, fieldDefinitions }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [birthDate, setBirthDate] = useState(profile.birth_date || '')
  const [sportsRole, setSportsRole] = useState<SportsRole>(profile.sports_role || 'jugador')
  const [customAttributes, setCustomAttributes] = useState<Record<string, Json>>(
    (profile.custom_attributes as Record<string, Json>) || {}
  )

  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCustomFieldChange = (key: string, val: Json) => {
    setCustomAttributes((prev) => ({
      ...prev,
      [key]: val,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('full_name', fullName)
    formData.append('phone', phone)
    formData.append('birth_date', birthDate)
    formData.append('sports_role', sportsRole)
    formData.append('custom_attributes', JSON.stringify(customAttributes))

    const res = await updateProfile(formData)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.success) {
      setMessage(res.message || 'Perfil guardado con éxito')
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const handleSignOut = async () => {
    if (confirm('¿Deseas cerrar tu sesión?')) {
      setSigningOut(true)
      await signOut()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar Section */}
      <div className="py-2">
        <AvatarUpload currentUrl={profile.avatar_url} fullName={profile.full_name} />
      </div>

      {/* Basic Profile Fields */}
      <div className="space-y-3.5">
        <div>
          <label htmlFor="full_name" className="block text-xs font-semibold text-neutral-700 mb-1">
            Nombre y Apellido <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej: Martín Palermo"
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1">
            Correo Electrónico
          </label>
          <input
            id="email"
            type="email"
            disabled
            value={profile.email}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm bg-neutral-100 text-neutral-500 cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-neutral-700 mb-1">
              Teléfono / WhatsApp
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
            />
          </div>

          <div>
            <label htmlFor="birth_date" className="block text-xs font-semibold text-neutral-700 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              id="birth_date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
            />
          </div>
        </div>

        {/* Sports Role Selector */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            Rol en el Club
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['jugador', 'hincha', 'ambos'] as SportsRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSportsRole(role)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition ${
                  sportsRole === role
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Profile Fields (JSONB) */}
      <DynamicProfileFields
        definitions={fieldDefinitions}
        values={customAttributes}
        onChange={handleCustomFieldChange}
      />

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 space-y-2.5">
        <button
          type="submit"
          disabled={loading || signingOut}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut || loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-200 text-neutral-600 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition active:scale-[0.98] disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
