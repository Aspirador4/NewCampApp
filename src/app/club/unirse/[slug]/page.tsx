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
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-2 pb-4 border-b-2 border-neutral-900/10">
        <Link
          href="/club/unirse"
          className="btn-tactile p-2.5 -ml-1 rounded-xl border-2 border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-900 shadow-tactile-sm transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Volver al directorio de clubes"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>
        <div>
          <h1 className="font-display font-black text-2xl text-neutral-950 uppercase tracking-tight leading-none">
            Solicitud de Fichaje
          </h1>
          <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
            Postulación a Membresía Deportiva
          </p>
        </div>
      </div>

      {/* Club Matchday Ticket Pass */}
      <div className="mt-4 bg-white border-2 border-neutral-900 shadow-tactile rounded-3xl overflow-hidden relative">
        <div className="bg-neutral-950 text-white p-4 border-b-2 border-neutral-900 flex items-center justify-between">
          <span className="font-mono text-[10px] font-black uppercase tracking-widest text-emerald-400">
            FICHA OFICIAL DE CLUB
          </span>
          <span className="font-mono text-[10px] font-bold text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
            /{club.slug}
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border-2 border-neutral-900 shadow-tactile-sm flex items-center justify-center text-white font-extrabold text-xl overflow-hidden flex-shrink-0">
              {club.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={club.logo_url}
                  alt={club.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Flame className="w-8 h-8 text-white" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-display font-black text-2xl text-neutral-950 uppercase tracking-tight leading-none truncate">
                {club.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-300">
                  <Users className="w-3 h-3 text-neutral-600" />
                  {membersCount} {membersCount === 1 ? 'SOCIO ACTIVO' : 'SOCIOS ACTIVOS'}
                </span>
              </div>
            </div>
          </div>

          {club.description && (
            <p className="text-xs text-neutral-700 bg-neutral-50 p-3.5 rounded-2xl border-2 border-neutral-200 leading-relaxed font-sans">
              {club.description}
            </p>
          )}
        </div>
      </div>

      {/* Membership State or Action */}
      <div className="mt-5">
        {!user ? (
          <div className="p-6 rounded-3xl bg-white border-2 border-neutral-900 shadow-tactile text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-neutral-900 shadow-tactile-sm text-neutral-900 flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tight text-neutral-950">
                Inicia Sesión para Continuar
              </h3>
              <p className="text-xs text-neutral-600 mt-1 max-w-xs mx-auto">
                Debes identificarte en el sistema para enviar tu solicitud de fichaje a este club.
              </p>
            </div>
            <Link
              href={`/login?next=/club/unirse/${club.slug}`}
              className="btn-tactile inline-flex items-center justify-center w-full py-3 px-4 rounded-xl border-2 border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-white font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition min-h-[44px]"
            >
              Iniciar Sesión o Registrarse
            </Link>
          </div>
        ) : currentMembership?.approval_status === 'aprobado' ? (
          <div className="p-6 rounded-3xl bg-white border-2 border-neutral-900 shadow-tactile text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border-2 border-neutral-900 shadow-tactile-sm text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tight text-neutral-950">
                ¡Ya Eres Miembro Oficial!
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Tu membresía está aprobada y activa. Puedes cambiar a este club para ver sus eventos y estadísticas.
              </p>
            </div>
            <JoinClubForm
              clubId={club.id}
              initialStatus="aprobado"
            />
          </div>
        ) : currentMembership?.approval_status === 'pendiente' ? (
          <div className="p-6 rounded-3xl bg-white border-2 border-neutral-900 shadow-tactile text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-neutral-900 shadow-tactile-sm text-amber-800 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7 stroke-[2.5] animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tight text-neutral-950">
                Solicitud en Revisión
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Tu postulación fue recibida por los capitanes de <strong className="text-neutral-950 font-bold">{club.name}</strong>. Te notificaremos cuando sea validada.
              </p>
            </div>
            {currentMembership.motivation && (
              <div className="p-3 bg-neutral-50 rounded-xl border-2 border-neutral-200 text-xs text-neutral-700 italic">
                &ldquo;{currentMembership.motivation}&rdquo;
              </div>
            )}
            <Link
              href="/"
              className="btn-tactile inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl border-2 border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-900 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition min-h-[44px]"
            >
              Volver al Clubhouse
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-neutral-900 shadow-tactile-sm text-xs text-neutral-900">
              <p className="font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Admisión Moderada por Directorio
              </p>
              <p className="text-neutral-700 mt-1 font-sans">
                Los administradores de <strong>{club.name}</strong> recibirán tu solicitud y ficha para habilitar tu pase oficial de vestuario.
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
