'use client'

import { useState } from 'react'
import { addTrainingOvercapacityGuest, removeTrainingOvercapacityGuest } from '@/app/eventos/guest-actions'
import { Plus, Trash2, Loader2, UserPlus } from 'lucide-react'

interface OvercapacityGuest {
  id: string
  guest_name: string
  guest_contact: string | null
}

interface TrainingOvercapacitySectionProps {
  eventId: string
  isTraining: boolean
  canManage: boolean
  overcapacityGuests: OvercapacityGuest[]
}

export function TrainingOvercapacitySection({
  eventId,
  isTraining,
  canManage,
  overcapacityGuests,
}: TrainingOvercapacitySectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isTraining || !canManage) return null

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setError(null)
    setLoading(true)
    const res = await addTrainingOvercapacityGuest(eventId, name, contact)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setName('')
      setContact('')
      setShowForm(false)
    }
  }

  const handleRemove = async (guestId: string) => {
    if (!confirm('¿Eliminar a este invitado del sobrecupo?')) return
    setError(null)
    setDeletingId(guestId)
    const res = await removeTrainingOvercapacityGuest(eventId, guestId)
    setDeletingId(null)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-3xl p-4 sm:p-5 border-2 border-neutral-800 shadow-tactile space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center border border-purple-400">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white">
                Sobrecupo de Entrenamiento
              </h3>
              <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Privado Admin
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
              Invitados por fuera que <strong className="text-purple-300 font-bold">no restan cupo</strong> a los socios.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="btn-tactile py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-display font-bold text-xs uppercase flex items-center gap-1 shadow-tactile-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir</span>
        </button>
      </div>

      {error && (
        <p className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-neutral-800/80 p-3.5 rounded-2xl border border-neutral-700 space-y-2.5">
          <p className="text-[11px] font-mono font-bold uppercase text-purple-300">
            Nuevo Invitado a Sobrecupo
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellido..."
              required
              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-purple-400"
            />
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contacto (teléfono/ig)..."
              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-xl text-neutral-400 hover:text-white text-xs font-display font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-tactile px-3.5 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-neutral-950 font-display font-bold text-xs uppercase shadow-tactile-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Guardar en Sobrecupo</span>
            </button>
          </div>
        </form>
      )}

      {overcapacityGuests.length === 0 ? (
        <p className="font-mono text-xs text-neutral-500 py-1 italic">
          No hay jugadores en sobrecupo para esta sesión.
        </p>
      ) : (
        <div className="divide-y divide-neutral-800 bg-neutral-950/60 rounded-2xl border border-neutral-800 overflow-hidden">
          {overcapacityGuests.map((g, idx) => (
            <div key={g.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-neutral-500">#{idx + 1}</span>
                <span className="font-bold text-white">{g.guest_name}</span>
                {g.guest_contact && (
                  <span className="text-[10px] text-neutral-400 font-mono">({g.guest_contact})</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(g.id)}
                disabled={deletingId === g.id}
                className="text-neutral-500 hover:text-rose-400 p-1 rounded-lg transition"
                title="Eliminar del sobrecupo"
              >
                {deletingId === g.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
