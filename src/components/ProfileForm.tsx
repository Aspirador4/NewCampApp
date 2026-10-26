'use client'

import { useState } from 'react'
import { updateProfile, signOut } from '@/app/auth/actions'
import { AvatarUpload } from '@/components/AvatarUpload'
import { DynamicProfileFields } from '@/components/DynamicProfileFields'
import { Database, Json, SportsRole } from '@/types/database.types'
import { Loader2, CheckCircle2, AlertCircle, LogOut, Save, Edit3, X, ShieldCheck, Mail, Calendar, UserCheck } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']
type FieldDefinition = Database['public']['Tables']['profile_field_definitions']['Row']

interface ProfileFormProps {
  profile: Profile
  fieldDefinitions: FieldDefinition[]
}

export function ProfileForm({ profile, fieldDefinitions }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Form states
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [birthDate, setBirthDate] = useState(profile.birth_date || '')
  const [gender, setGender] = useState<'masculino' | 'femenino' | 'otro' | ''>(profile.gender || '')
  const [sportsRole, setSportsRole] = useState<SportsRole>(profile.sports_role || 'jugador')
  const [customAttributes, setCustomAttributes] = useState<Record<string, Json>>(
    (profile.custom_attributes as Record<string, Json>) || {}
  )

  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const maxBirthDate = new Date(
    new Date().getFullYear() - 18,
    new Date().getMonth(),
    new Date().getDate()
  ).toISOString().split('T')[0]

  const handleCustomFieldChange = (key: string, val: Json) => {
    setCustomAttributes((prev) => ({
      ...prev,
      [key]: val,
    }))
  }

  const handleCancel = () => {
    // Revert form state to saved profile
    setFullName(profile.full_name || '')
    setBirthDate(profile.birth_date || '')
    setGender(profile.gender || '')
    setSportsRole(profile.sports_role || 'jugador')
    setCustomAttributes((profile.custom_attributes as Record<string, Json>) || {})
    setError(null)
    setIsEditing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // Validate 18+ years
    if (birthDate) {
      const birth = new Date(birthDate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      if (age < 18) {
        setError('Debes tener al menos 18 años para participar en el club.')
        return
      }
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('full_name', fullName)
    formData.append('birth_date', birthDate)
    formData.append('gender', gender)
    formData.append('sports_role', sportsRole)
    formData.append('custom_attributes', JSON.stringify(customAttributes))

    const res = await updateProfile(formData)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.success) {
      setMessage(res.message || 'Perfil guardado con éxito')
      setIsEditing(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
  }

  // Format birth_date display
  const formattedBirthDate = profile.birth_date
    ? new Date(profile.birth_date).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-5">
      {/* Messages */}
      {message && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Avatar Section */}
      <div className="flex flex-col items-center justify-center pt-2">
        <AvatarUpload
          currentUrl={profile.avatar_url}
          fullName={profile.full_name}
          editable={true}
        />
        <div className="mt-3 text-center">
          <h2 className="text-lg font-black text-neutral-900 leading-tight">
            {profile.full_name || 'Socio Sin Nombre'}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">{profile.email}</p>

          <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--club-primary-light, #ecfdf5)',
                color: 'var(--club-primary, #059669)',
              }}
            >
              Rol: {profile.sports_role}
            </span>
            {profile.system_role === 'admin' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-neutral-900 text-white">
                <ShieldCheck className="w-3 h-3" />
                <span>Admin</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toggle View Mode / Edit Mode */}
      {!isEditing ? (
        /* READ-ONLY SUMMARY VIEW */
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              Información Personal
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition active:scale-95 flex items-center gap-1.5 shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Datos</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                Nombre completo:
              </span>
              <span className="font-bold text-neutral-900">{profile.full_name || 'No especificado'}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                Correo electrónico:
              </span>
              <span className="font-medium text-neutral-700">{profile.email}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Fecha de nacimiento:
              </span>
              <span className="font-bold text-neutral-900">{formattedBirthDate || 'No especificada'}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <span className="text-neutral-500 font-medium">Género:</span>
              <span className="font-bold text-neutral-900 capitalize">
                {profile.gender || 'No especificado'}
              </span>
            </div>
          </div>

          {/* Dynamic Profile Fields in Read-Only Mode */}
          <DynamicProfileFields
            definitions={fieldDefinitions}
            values={(profile.custom_attributes as Record<string, Json>) || {}}
            readOnly={true}
          />
        </div>
      ) : (
        /* EDIT MODE (Form) */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-neutral-700" />
              <span>Editando Información Personal</span>
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="w-10 h-10 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition flex items-center justify-center"
              title="Cancelar edición"
              aria-label="Cancelar edición"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Basic Profile Inputs */}
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
                placeholder="Ej: Sebastián Arenas"
                className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900"
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
                className="w-full px-3.5 py-3 rounded-xl border border-neutral-200 text-base sm:text-sm bg-neutral-100 text-neutral-500 cursor-not-allowed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="birth_date" className="block text-xs font-semibold text-neutral-700">
                  Fecha de Nacimiento
                </label>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  +18 años requeridos
                </span>
              </div>
              <input
                id="birth_date"
                type="date"
                max={maxBirthDate}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Debes tener al menos 18 años para participar en el club.
              </p>
            </div>

            {/* Gender Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Género
                </label>
                <span className="text-[10px] text-neutral-700 font-semibold bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                  Relevante para convocatorias
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                Relevante para convocatorias y eventos por categoría (femenino, masculino o mixto).
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'masculino', label: '👨 Masculino' },
                  { value: 'femenino', label: '👩 Femenino' },
                  { value: 'otro', label: '⚧ Otro' },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value as 'masculino' | 'femenino' | 'otro')}
                    className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-semibold border transition text-center active:scale-95 ${
                      gender === g.value
                        ? 'text-white border-transparent shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    style={
                      gender === g.value
                        ? { backgroundColor: 'var(--club-primary, #059669)' }
                        : undefined
                    }
                  >
                    {g.label}
                  </button>
                ))}
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
                    className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition active:scale-95 ${
                      sportsRole === role
                        ? 'text-white border-transparent shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    style={
                      sportsRole === role
                        ? { backgroundColor: 'var(--club-primary, #059669)' }
                        : undefined
                    }
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Profile Fields (JSONB) with Multiselect Combo */}
          <DynamicProfileFields
            definitions={fieldDefinitions}
            values={customAttributes}
            onChange={handleCustomFieldChange}
            readOnly={false}
          />

          {/* Action Buttons: Save & Cancel */}
          <div className="pt-3 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--club-primary, #059669)',
              }}
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
              onClick={handleCancel}
              disabled={loading}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>
          </div>
        </form>
      )}

      {/* Sign Out Button (always accessible at bottom) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut || loading}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-200 text-neutral-600 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition active:scale-[0.98] disabled:opacity-50"
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
    </div>
  )
}
