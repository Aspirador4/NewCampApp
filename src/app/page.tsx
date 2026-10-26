import { createClient } from "@/utils/supabase/server";
import { ArrowRight, UserCircle2, Calendar, MapPin, Users, CircleDollarSign, User, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { AppOnboardingModal } from "@/components/AppOnboardingModal";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";
import { ClubSwitcher } from "@/components/ClubSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { getActiveClub } from "@/utils/club";
import { getClubTheme } from "@/utils/theme";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get active club & membership context
  const { club, membership, userClubs, isApproved, isAdmin } = await getActiveClub(supabase);
  const theme = getClubTheme(club);

  let profile = null;
  let hasPushSub = false;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;

    // Check if account has an active push subscription
    const { count } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    hasPushSub = (count ?? 0) > 0;
  }

  // Gatekeeper: If user is logged in but not yet approved in this club,
  // they see the pending approval screen with club motivation options.
  if (user && !isApproved) {
    return (
      <PendingApprovalScreen
        fullName={profile?.full_name || user.user_metadata?.full_name || 'Nuevo Miembro'}
        email={user.email ?? ''}
        initialMotivation={membership?.motivation || profile?.motivation}
        approvalStatus={membership?.approval_status || 'pendiente'}
        clubName={club.name}
        clubId={club.id}
      />
    );
  }

  // Fetch next upcoming event for the active club
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select(`
      *,
      creator:created_by (
        full_name
      ),
      event_attendees (
        id,
        status
      ),
      event_guests (
        id,
        status
      )
    `)
    .eq('club_id', club.id)
    .in('status', ['convocado', 'en_curso'])
    .order('start_time', { ascending: true })
    .limit(1);

  const nextEvent = upcomingEvents?.[0] || null;
  const confirmedAttendees = nextEvent?.event_attendees?.filter(
    (a: { id: string; status: string }) => a.status === 'confirmado'
  ).length || 0;
  const approvedGuests = nextEvent?.event_guests?.filter(
    (g: { id: string; status: string }) => g.status === 'aprobado'
  ).length || 0;
  const confirmedCount = confirmedAttendees + approvedGuests;

  return (
    <div className="flex-1 flex flex-col p-5 pb-nav">
      {/* Mobile Header with Club Switcher */}
      <header className="pt-2 pb-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <ClubSwitcher
            currentClub={club}
            userClubs={userClubs}
            currentRole={membership?.system_role}
            currentApproval={membership?.approval_status}
            isAuthenticated={Boolean(user)}
          />

          <Link
            href="/club/nuevo"
            className="w-11 h-11 rounded-2xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition flex items-center justify-center active:scale-95"
            title="Crear o unirme a otro club"
            aria-label="Crear nuevo club"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 py-4 flex flex-col gap-4">
        {/* User Card */}
        {user ? (
          <div
            className="border rounded-2xl p-4 shadow-xs flex items-center justify-between"
            style={{
              backgroundColor: 'var(--club-primary-light, #ecfdf5)',
              borderColor: 'var(--club-primary-border, #a7f3d0)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs"
                style={{ backgroundColor: 'var(--club-primary, #059669)' }}
              >
                {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold uppercase tracking-wider truncate"
                  style={{ color: 'var(--club-primary, #059669)' }}
                >
                  Socio Activo • {club.name}
                </p>
                <p className="text-sm font-bold text-neutral-900 truncate">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-[11px] text-neutral-500 capitalize truncate">
                  {profile?.custom_attributes && typeof profile.custom_attributes === 'object' && 'posicion' in profile.custom_attributes && (profile.custom_attributes as Record<string, unknown>).posicion
                    ? Array.isArray((profile.custom_attributes as Record<string, unknown>).posicion)
                      ? ((profile.custom_attributes as Record<string, unknown>).posicion as string[]).join(', ')
                      : String((profile.custom_attributes as Record<string, unknown>).posicion)
                    : `Rol: ${membership?.sports_role || profile?.sports_role || 'Jugador'}`}
                </p>
              </div>
            </div>
            <Link
              href="/perfil"
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition shadow-xs flex items-center justify-center flex-shrink-0 active:scale-95 ml-2"
              aria-label="Ir a mi perfil"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div
            className="text-white rounded-2xl p-5 shadow-md flex flex-col gap-3"
            style={{
              background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
            }}
          >
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white inline-block mb-2">
                Acceso Exclusivo
              </span>
              <h2 className="text-lg font-extrabold leading-snug">
                Bienvenido a {club.name}
              </h2>
              <p className="text-xs text-white/90 mt-1">
                Inicia sesión con tu correo o Google para confirmar asistencias, entrar a listas de espera y votar MVP.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-1 w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-neutral-900 font-bold text-xs shadow-xs hover:bg-neutral-100 transition active:scale-[0.98]"
            >
              <UserCircle2 className="w-4 h-4" />
              <span>Ingresar o Registrarse</span>
            </Link>
          </div>
        )}

        <AppOnboardingModal
          isLoggedIn={Boolean(user)}
          userId={user?.id}
          hasPushSub={hasPushSub}
        />

        {/* Next Event Highlight Card */}
        {nextEvent ? (
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider"
                  style={{
                    backgroundColor: 'var(--club-primary-light, #ecfdf5)',
                    color: 'var(--club-primary, #059669)',
                  }}
                >
                  Próximo {nextEvent.event_type}
                </span>
                {nextEvent.gender_category && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                    nextEvent.gender_category === 'femenino'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : nextEvent.gender_category === 'masculino'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {nextEvent.gender_category === 'femenino' ? '👩 Femenino' : nextEvent.gender_category === 'masculino' ? '👨 Masculino' : '👫 Mixto'}
                  </span>
                )}
              </div>
              <Link
                href={`/eventos/${nextEvent.id}`}
                className="text-xs font-bold flex items-center gap-1 min-h-[36px] px-2 rounded-lg hover:bg-neutral-50 transition"
                style={{ color: 'var(--club-primary, #059669)' }}
              >
                <span>Ver Convocatoria</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div>
              <h3 className="font-bold text-base text-neutral-900 leading-tight">
                {nextEvent.title}
              </h3>
              <div className="mt-2.5 space-y-1.5 text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    {new Date(nextEvent.start_time).toLocaleDateString('es-AR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="truncate">{nextEvent.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    {nextEvent.max_capacity
                      ? `${confirmedCount} / ${nextEvent.max_capacity} confirmados`
                      : `${confirmedCount} confirmados`}
                  </span>
                </div>
                {(Boolean(nextEvent.total_cost && nextEvent.total_cost > 0) || Boolean(nextEvent.cost_per_player && nextEvent.cost_per_player > 0)) && (
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="w-3.5 h-3.5" style={{ color: 'var(--club-primary, #059669)' }} />
                    <span className="font-semibold text-neutral-800">
                      {nextEvent.total_cost && nextEvent.total_cost > 0
                        ? `~$${Math.round(nextEvent.total_cost / (nextEvent.max_capacity || 14)).toLocaleString('es-CL')} p/jugador`
                        : `$${nextEvent.cost_per_player.toLocaleString('es-CL')} p/jugador`}
                    </span>
                  </div>
                )}
                {nextEvent.creator && (
                  <div className="flex items-center gap-2 pt-0.5 text-neutral-500">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      Convocado por <strong className="text-neutral-700 font-semibold">{nextEvent.creator.full_name}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="Sin eventos próximos"
            description={`No hay partidos ni entrenamientos convocados en ${club.name}.`}
            action={
              isAdmin
                ? { label: '+ Convocar Partido', href: '/eventos/nuevo' }
                : { label: 'Ver Historial de Eventos', href: '/eventos' }
            }
          />
        )}

        {/* Quick Access Menu Cards */}
        <div className="space-y-2.5 pt-1">
          <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider px-1">
            Accesos Rápidos
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/eventos"
              className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition flex flex-col justify-between gap-3 min-h-[96px] active:scale-98"
            >
              <div
                className="p-2.5 rounded-xl w-fit"
                style={{
                  backgroundColor: 'var(--club-primary-light, #ecfdf5)',
                  color: 'var(--club-primary, #059669)',
                }}
              >
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900 leading-tight">
                  Partidos & Eventos
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Convocatorias y cupos
                </p>
              </div>
            </Link>

            <Link
              href="/finanzas"
              className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition flex flex-col justify-between gap-3 min-h-[96px] active:scale-98"
            >
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 w-fit">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900 leading-tight">
                  Finanzas & Deudas
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Estado de cuenta
                </p>
              </div>
            </Link>

            <Link
              href="/miembros"
              className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition flex flex-col justify-between gap-3 min-h-[96px] active:scale-98"
            >
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 w-fit">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900 leading-tight">
                  Miembros del Club
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Directorio y fichas
                </p>
              </div>
            </Link>

            <Link
              href="/perfil"
              className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition flex flex-col justify-between gap-3 min-h-[96px] active:scale-98"
            >
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 w-fit">
                <UserCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900 leading-tight">
                  Mi Perfil
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Camiseta y posiciones
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* GitHub Collaboration Footer */}
        <div className="mt-4 pt-4 border-t border-neutral-200 text-center space-y-2">
          <p className="text-[11px] text-neutral-500">
            ¿Quieres proponer ideas o colaborar con código?
          </p>
          <div>
            <a
              href="https://github.com/Aspirador4/NewCampApp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition active:scale-95 shadow-xs min-h-[40px]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Colaborar en GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
