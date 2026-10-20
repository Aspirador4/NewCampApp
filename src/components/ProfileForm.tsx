'use client'

import { useState } from 'react'
import { updateProfile, signOut } from '@/app/auth/actions'
import { AvatarUpload } from '@/components/AvatarUpload'
import { DynamicProfileFields } from '@/components/DynamicProfileFields'
import { Database, Json, SportsRole } from '@/types/database.types'
import { Loader2, CheckCircle2, AlertCircle, LogOut, Save, Edit3, X, ShieldCheck, Mail, Phone, Calendar, UserCheck } from 'lucide-react'

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

  const handleCancel = () => {
    // Revert form state to saved profile
    setFullName(profile.full_name || '')
    setPhone(profile.phone || '')
    setBirthDate(profile.birth_date || '')
    setSportsRole(profile.sports_role || 'jugador')
    setCustomAttributes((profile.custom_attributes as Record<string, Json>) || {})
    setError(null)
    setIsEditing(false)
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
      setIsEditing(false)
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
    <div className="space-y-5">
      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Avatar Section */}
      <div className="py-2">
        <AvatarUpload
          currentUrl={profile.avatar_url}
          fullName={fullName || profile.full_name}
          editable={isEditing}
        />
      </div>

      {/* VIEW MODE (Default) */}
      {!isEditing ? (
        <div className="space-y-4">
          {/* Header Info Card */}
          <div className="text-center pb-2">
            <h2 className="text-lg font-bold text-neutral-900 leading-tight">
              {fullName || 'Nuevo Socio'}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs text-neutral-500">{profile.email}</span>
              {profile.system_role === 'admin' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600">
                  Socio
                </span>
              )}
            </div>
          </div>

          {/* Read-Only Details List */}
          <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs py-1 border-b border-neutral-200/60">
              <div className="flex items-center gap-2 text-neutral-500 font-medium">
                <UserCheck className="w-4 h-4 text-neutral-400" />
                <span>Rol en el Club</span>
              </div>
              <span className="font-bold text-neutral-800 capitalize bg-white px-2.5 py-1 rounded-lg border border-neutral-200">
                {sportsRole}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-neutral-200/60">
              <div className="flex items-center gap-2 text-neutral-500 font-medium">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span>Correo</span>
              </div>
              <span className="font-medium text-neutral-800">{profile.email}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-neutral-200/60">
              <div className="flex items-center gap-2 text-neutral-500 font-medium">
                <Phone className="w-4 h-4 text-neutral-400" />
                <span>Teléfono</span>
              </div>
              <span className="font-medium text-neutral-800">
                {phone || <span className="text-neutral-400 italic">No registrado</span>}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2 text-neutral-500 font-medium">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>Nacimiento</span>
              </div>
              <span className="font-medium text-neutral-800">
                {birthDate || <span className="text-neutral-400 italic">No registrada</span>}
              </span>
            </div>
          </div>

          {/* Dynamic Fields (Read-Only) */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80">
            <DynamicProfileFields
              definitions={fieldDefinitions}
              values={customAttributes}
              readOnly={true}
            />
          </div>

          {/* Explicit "Editar Perfil" Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition active:scale-[0.98]"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Perfil</span>
            </button>
          </div>
        </div>
      ) : (
        /* EDIT MODE (Form) */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>Editando Información Personal</span>
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition"
              title="Cancelar edición"
            >
              <X className="w-4 h-4" />
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
              onClick={handleCancel}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
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
    </div>
  )
}
