'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { MapPin, Clock, Users, ArrowRight, Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Database } from '@/types/database.types'

export type HomeEventItem = Database['public']['Tables']['events']['Row'] & {
  creator: { full_name: string } | null
  event_attendees: { id: string; status: string; attendance_type?: string }[] | null
  event_guests: { id: string; status: string; is_overcapacity?: boolean }[] | null
}

interface HomeEventsCarouselProps {
  events: HomeEventItem[]
  clubName: string
  isAdmin: boolean
}

export function HomeEventsCarousel({ events, clubName, isAdmin }: HomeEventsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, clientWidth } = scrollRef.current
    if (clientWidth === 0) return
    const newIndex = Math.round(scrollLeft / (clientWidth * 0.88))
    setActiveIndex(Math.min(events.length - 1, Math.max(0, newIndex)))
  }

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return
    const target = scrollRef.current.children[index] as HTMLElement
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      setActiveIndex(index)
    }
  }

  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Sin eventos próximos"
        description={`No hay partidos ni entrenamientos convocados en ${clubName}.`}
        action={
          isAdmin
            ? { label: '+ Convocar Partido', href: '/eventos/nuevo' }
            : { label: 'Ver Historial de Eventos', href: '/eventos' }
        }
      />
    )
  }

  const formatEventDate = (isoString: string) => {
    const date = new Date(isoString)
    const weekday = date.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase()
    const day = date.getDate()
    const month = date.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()
    const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    return { weekday, day, month, time }
  }

  return (
    <div className="space-y-2">
      {/* Header controls if more than 1 event */}
      {events.length > 1 && (
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Agenda del Club ({activeIndex + 1} de {events.length})</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mr-1 hidden sm:inline">
              Desliza lateralmente
            </span>
            <button
              type="button"
              onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              aria-label="Evento anterior"
              className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollToIndex(Math.min(events.length - 1, activeIndex + 1))}
              disabled={activeIndex === events.length - 1}
              aria-label="Siguiente evento"
              className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Swipeable Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3.5 ${
          events.length > 1 ? '-mx-4 px-4 pb-2' : ''
        }`}
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {events.map((evt, idx) => {
          const confirmedAttendees = evt.event_attendees?.filter(
            (a) => a.status === 'confirmado' && (!a.attendance_type || a.attendance_type === 'jugador')
          ).length || 0

          const spectatorsCount = evt.event_attendees?.filter(
            (a) => a.status === 'confirmado' && a.attendance_type === 'espectador'
          ).length || 0

          const approvedGuests = evt.event_guests?.filter(
            (g) => g.status === 'aprobado' && !g.is_overcapacity
          ).length || 0

          const confirmedCount = confirmedAttendees + approvedGuests
          const maxCap = evt.max_capacity || 0
          const isFull = maxCap > 0 && confirmedCount >= maxCap
          const capacityPercent = maxCap > 0 ? Math.min(100, Math.round((confirmedCount / maxCap) * 100)) : 0
          const { weekday, day, month, time } = formatEventDate(evt.start_time)

          return (
            <div
              key={evt.id}
              className={`relative bg-white dark:bg-neutral-900 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile overflow-hidden shrink-0 snap-center ${
                events.length > 1 ? 'w-[88vw] sm:w-[440px]' : 'w-full'
              }`}
            >
              {/* Ticket Notches */}
              <div className="absolute -left-2.5 top-[60%] -translate-y-1/2 w-5 h-5 bg-neutral-50 dark:bg-[#0c0d12] rounded-full border-2 border-neutral-900 dark:border-neutral-700 z-10" />
              <div className="absolute -right-2.5 top-[60%] -translate-y-1/2 w-5 h-5 bg-neutral-50 dark:bg-[#0c0d12] rounded-full border-2 border-neutral-900 dark:border-neutral-700 z-10" />

              {/* Ticket Top Header Bar */}
              <div className="bg-neutral-900 dark:bg-neutral-950 text-white px-4 py-2.5 flex items-center justify-between border-b-2 border-neutral-900 dark:border-neutral-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                    {evt.status === 'en_curso'
                      ? '🔴 EN VIVO'
                      : idx === 0
                      ? `PRÓXIMO ${evt.event_type.toUpperCase()}`
                      : `${evt.event_type.toUpperCase()} #${idx + 1}`}
                  </span>
                  {evt.gender_category && (
                    <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20">
                      {evt.gender_category === 'femenino' ? 'Femenino' : evt.gender_category === 'masculino' ? 'Masculino' : 'Mixto'}
                    </span>
                  )}
                  {spectatorsCount > 0 && (
                    <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{spectatorsCount} en tribuna</span>
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase">
                  ENTRY #{evt.id.slice(0, 4)}
                </span>
              </div>

              {/* Ticket Body */}
              <div className="p-4 space-y-3.5">
                <div>
                  <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-mono text-[11px] uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                  <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-neutral-950 dark:text-white leading-tight mt-0.5 truncate">
                    {evt.title}
                  </h3>
                </div>

                {/* Scoreboard Date & Time Grid */}
                <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-neutral-800/60 p-2.5 rounded-2xl border border-neutral-300 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 shadow-tactile-sm flex-shrink-0">
                      {day}
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase block leading-none">Fecha</span>
                      <span className="font-display font-bold text-xs uppercase text-neutral-900 dark:text-neutral-100 truncate block mt-0.5">
                        {weekday} • {month}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 shadow-tactile-sm flex-shrink-0">
                      <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase block leading-none">Kickoff</span>
                      <span className="font-mono font-semibold text-xs tracking-wider text-neutral-900 dark:text-neutral-100 truncate block mt-0.5">
                        {time} HRS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stadium Cupos & Progress Bar */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Convocatoria en Cancha</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {confirmedCount} {maxCap ? `/ ${maxCap}` : ''} Confirmados
                    </span>
                  </div>

                  {maxCap > 0 && (
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${capacityPercent}%`,
                          backgroundColor: isFull ? '#dc2626' : 'var(--club-primary, #059669)',
                        }}
                      />
                    </div>
                  )}

                  {isFull && (
                    <p className="font-mono text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                      ⚠ Cupo completo • Lista de espera activa
                    </p>
                  )}
                </div>

                {/* Dashed Perforation Line */}
                <div className="border-b-2 border-dashed border-neutral-300 dark:border-neutral-700 -mx-4 my-2" />

                {/* Ticket Stub Action / Price */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <div>
                    <span className="font-mono text-[9px] uppercase text-neutral-500 dark:text-neutral-400 block">Cuota estimada</span>
                    <span className="font-display font-bold text-base text-neutral-950 dark:text-white">
                      {evt.total_cost && evt.total_cost > 0
                        ? `~$${Math.round(evt.total_cost / (maxCap || 14)).toLocaleString('es-CL')}`
                        : evt.cost_per_player && evt.cost_per_player > 0
                        ? `$${evt.cost_per_player.toLocaleString('es-CL')}`
                        : 'Gratis'}
                      <span className="text-[10px] font-sans font-normal text-neutral-500 dark:text-neutral-400 ml-1">p/jugador</span>
                    </span>
                  </div>

                  <Link
                    href={`/eventos/${evt.id}`}
                    className="btn-tactile bg-neutral-950 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-display text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center gap-1.5 flex-shrink-0"
                  >
                    <span>Ver Ficha</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination dots */}
      {events.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {events.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Ir al evento ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                activeIndex === i
                  ? 'w-6 bg-neutral-900 dark:bg-white'
                  : 'w-1.5 bg-neutral-300 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
