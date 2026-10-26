import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowLeft, Building2, Users, Clock, CheckCircle2, Flame, Sparkles } from 'lucide-react'
import { JoinClubForm } from './JoinClubForm'

interface UnirseClubPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function UnirseClubPage({ params }: UnirseClubPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch target club
  const { data: clubRaw } = await supabase
    .from('clubs')
    .select(`
      id,
      name,
      slug,
      logo_url,
      description,
      created_at,
      created_by,
      creator:created_by (
        full_name
      ),
      club_members (
        id,
        approval_status
      )
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (!clubRaw) {
    notFound()
  }

  interface RawClub {
    id: string
    name: string
    slug: string
    logo_url: string | null
    description: string | null
    creator: { full_name: string } | null
    club_members: { id: string; approval_status: string }[] | null
  }

  const club = clubRaw as unknown as RawClub
  const membersCount = (club.club_members || []).filter((m) => m.approval_status === 'aprobado').length

  // Check if current user already has membership
  let currentMembership = null
  if (user) {
    const { data: mem } = await supabase
      .from('club_members')
      .select('id, system_role, approval_status, motivation')
      .eq('club_id', club.id)
      .eq('user_id', user.id)
      .maybeSingle()

    currentMembership = mem
  }

  return (
    <div className="flex-1 flex flex-col p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-2 pb-5 border-b border-neutral-200">
        <Link
          href="/club/unirse"
          className="p-2.5 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Volver al directorio de clubes"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Solicitud de Admisión</h1>
          <p className="text-xs text-neutral-500">Únete a la comunidad de este club</p>
        </div>
      </div>

      {/* Club Summary Card */}
      <div className="mt-5 p-5 rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md flex-shrink-0">
            {club.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={club.logo_url}
                alt={club.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <Flame className="w-8 h-8 text-white" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="font-extrabold text-lg text-white truncate leading-tight">
              {club.name}
            </h2>
            <p className="text-xs text-emerald-400 font-mono mt-0.5 font-semibold">
              /{club.slug}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-300">
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                {membersCount} {membersCount === 1 ? 'socio activo' : 'socios activos'}
              </span>
            </div>
          </div>
        </div>

        {club.description && (
          <p className="text-xs text-neutral-300 bg-neutral-800/80 p-3 rounded-2xl border border-neutral-700/60 leading-relaxed">
            {club.description}
          </p>
        )}
      </div>

      {/* Membership State or Action */}
      <div className="mt-6">
        {!user ? (
          <div className="p-6 rounded-3xl bg-neutral-50 border border-neutral-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-base">Inicia sesión para continuar</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Debes identificarte para enviar tu solicitud de admisión a este club.
              </p>
            </div>
            <Link
              href={`/login?next=/club/unirse/${club.slug}`}
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-98"
            >
              Iniciar Sesión o Registrarse
            </Link>
          </div>
        ) : currentMembership?.approval_status === 'aprobado' ? (
          <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-base">¡Ya eres miembro de este club!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Tu membresía está aprobada y activa. Puedes cambiar a este club para ver sus eventos y estadísticas.
              </p>
            </div>
            <JoinClubForm
              clubId={club.id}
              initialStatus="aprobado"
            />
          </div>
        ) : currentMembership?.approval_status === 'pendiente' ? (
          <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-base">Solicitud en Revisión</h3>
              <p className="text-xs text-amber-800 mt-1">
                Tu solicitud fue recibida por los administradores de <strong>{club.name}</strong>. Te notificaremos apenas sea revisada.
              </p>
            </div>
            {currentMembership.motivation && (
              <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-900 italic">
                &ldquo;{currentMembership.motivation}&rdquo;
              </div>
            )}
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow transition active:scale-98"
            >
              Volver al Inicio
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Admisión Moderada
              </p>
              <p className="text-emerald-700 mt-0.5">
                Los administradores de <strong>{club.name}</strong> recibirán tu solicitud para habilitar tu acceso completo.
              </p>
            </div>

            <JoinClubForm
              clubId={club.id}
              initialStatus={currentMembership?.approval_status || null}
              initialMotivation={currentMembership?.motivation || ''}
            />
          </div>
        )}
      </div>
    </div>
  )
}
