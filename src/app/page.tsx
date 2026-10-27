import { createClient } from "@/utils/supabase/server";
import {
  ArrowRight,
  UserCircle2,
  Calendar,
  MapPin,
  Users,
  Plus,
  Wallet,
  Trophy,
  Clock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AppOnboardingModal } from "@/components/AppOnboardingModal";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";
import { ClubSwitcher } from "@/components/ClubSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  let pendingDebtsCount = 0;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;

    // Check push subscription
    const { count: pushCount } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    hasPushSub = (pushCount ?? 0) > 0;

    // Check user's pending debts in this club
    const { count: debtCount } = await supabase
      .from('member_debts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pendiente');
    pendingDebtsCount = debtCount ?? 0;
  }

  // Count active squad members for the club
  const { count: clubMembersCount } = await supabase
    .from('club_members')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', club.id)
    .eq('approval_status', 'aprobado');

  // Gatekeeper: Pending approval screen
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
  const maxCap = nextEvent?.max_capacity || 0;
  const isFull = maxCap > 0 && confirmedCount >= maxCap;
  const capacityPercent = maxCap > 0 ? Math.min(100, Math.round((confirmedCount / maxCap) * 100)) : 0;

  // Custom attributes parsing (jersey number, position)
  const customAttrs = (profile?.custom_attributes as Record<string, unknown>) || {};
  const jerseyNumber = customAttrs.numero_camiseta ? String(customAttrs.numero_camiseta) : null;
  const playerPosition = customAttrs.posicion
    ? Array.isArray(customAttrs.posicion)
      ? customAttrs.posicion.join(' / ')
      : String(customAttrs.posicion)
    : (membership?.sports_role || profile?.sports_role || 'Jugador');

  const formatEventDate = (isoString: string) => {
    const date = new Date(isoString);
    const weekday = date.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase();
    const day = date.getDate();
    const month = date.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase();
    const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return { weekday, day, month, time };
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Mobile Header with Club Switcher */}
      <header className="pt-2 pb-4 border-b-2 border-neutral-900/10 dark:border-white/10">
        <div className="flex items-center justify-between">
          <ClubSwitcher
            currentClub={club}
            userClubs={userClubs}
            currentRole={membership?.system_role}
            currentApproval={membership?.approval_status}
            isAuthenticated={Boolean(user)}
          />

          <div className="flex items-center gap-2">
            <ThemeToggle variant="compact" />
            <Link
              href="/club/nuevo"
              className="w-11 h-11 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center justify-center shadow-tactile-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[44px] min-w-[44px]"
              title="Crear o unirme a otro club"
              aria-label="Crear nuevo club"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 py-4 flex flex-col gap-4">
        {/* HERO COMPONENT: Carnet Oficial de Socio (Logged In) OR Official Guest Pass (Logged Out) */}
        {user ? (
          <div className="relative overflow-hidden rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-950 text-white shadow-tactile p-4">
            {/* Athletic mesh texture overlay */}
            <div className="absolute inset-0 bg-mesh-pattern-white opacity-10 pointer-events-none" />

            {/* Club dynamic glow accent */}
            <div
              className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl opacity-40 pointer-events-none"
              style={{ backgroundColor: theme.primary }}
            />

            {/* Top Credential Header */}
            <div className="relative flex items-center justify-between pb-3 border-b border-white/10 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold uppercase tracking-widest text-emerald-400">
                  CARNET OFICIAL DE SOCIO
                </span>
              </div>
              <span className="uppercase text-neutral-400 tracking-wider truncate max-w-[140px]">
                {club.name}
              </span>
            </div>

            {/* Member Details */}
            <div className="relative pt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Tactile Player Avatar */}
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-white/20 flex items-center justify-center flex-shrink-0 shadow-tactile-sm">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Avatar'}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <span className="font-display font-black text-xl text-white">
                      {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider"
                      style={{
                        backgroundColor: 'var(--club-primary-light, #ecfdf5)',
                        borderColor: 'var(--club-primary-border, #a7f3d0)',
                        color: 'var(--club-primary, #059669)',
                      }}
                    >
                      {membership?.system_role === 'admin' ? 'Capitán / Admin' : 'Socio Activo'}
                    </span>
                    <span className="font-mono text-[9px] text-neutral-400 uppercase truncate">
                      {playerPosition}
                    </span>
                  </div>
                  <p className="font-display text-xl font-black uppercase text-white truncate leading-tight mt-0.5 tracking-tight">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </p>
                </div>
              </div>

              {/* Dorsal or Member Number */}
              <div className="text-right flex-shrink-0 flex flex-col items-end pl-2">
                <span className="font-mono text-[9px] text-neutral-400 uppercase block tracking-wider leading-none">
                  {jerseyNumber ? 'Dorsal' : 'Ficha'}
                </span>
                <span className="font-display font-black text-2xl text-white/90 leading-none mt-1">
                  {jerseyNumber ? `#${jerseyNumber}` : `#${profile?.id ? profile.id.slice(0, 3) : '10'}`}
                </span>
              </div>
            </div>

            {/* Credential Action Footer */}
            <div className="relative mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 font-sans truncate">
                Perfil deportivo & dorsal oficial
              </span>
              <Link
                href="/perfil"
                className="btn-tactile bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white font-display font-black text-xs uppercase tracking-wide px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-tactile-sm flex items-center gap-1 flex-shrink-0"
              >
                <span>Ver Ficha</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-950 dark:text-white" />
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-950 text-white shadow-tactile p-5"
            style={{
              backgroundImage: `radial-gradient(circle at top right, ${theme.gradientFrom}33, transparent 70%)`,
            }}
          >
            <div className="absolute inset-0 bg-mesh-pattern-white opacity-10 pointer-events-none" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  PASE DE INVITADO OFICIAL
                </span>
                <span className="text-neutral-400 uppercase">{club.name}</span>
              </div>
              <div>
                <h2 className="font-display font-black text-2xl uppercase tracking-tight text-white leading-tight">
                  Bienvenido al Club
                </h2>
                <p className="text-xs text-neutral-300 mt-1 font-sans leading-relaxed">
                  Ingresa con tu correo o Google para confirmar tu asistencia a partidos, acceder a la lista de espera automática y votar al MVP del tercer tiempo.
                </p>
              </div>
              <Link
                href="/login"
                className="btn-tactile w-full py-3 px-4 rounded-xl bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white font-display font-black text-sm uppercase tracking-wide border border-neutral-300 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-center gap-2"
              >
                <UserCircle2 className="w-4 h-4" />
                <span>Ingresar o Registrarme</span>
              </Link>
            </div>
          </div>
        )}

        <AppOnboardingModal
          isLoggedIn={Boolean(user)}
          userId={user?.id}
          hasPushSub={hasPushSub}
        />

        {/* HERO COMPONENT: Matchday Ticket Stub */}
        {nextEvent ? (
          <div className="relative bg-white dark:bg-neutral-900 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile overflow-hidden">
            {/* Ticket Notches (muescas laterales de entrada física) */}
            <div className="absolute -left-2.5 top-[60%] -translate-y-1/2 w-5 h-5 bg-neutral-50 dark:bg-[#0c0d12] rounded-full border-2 border-neutral-900 dark:border-neutral-700 z-10" />
            <div className="absolute -right-2.5 top-[60%] -translate-y-1/2 w-5 h-5 bg-neutral-50 dark:bg-[#0c0d12] rounded-full border-2 border-neutral-900 dark:border-neutral-700 z-10" />

            {/* Ticket Top Header Bar */}
            <div className="bg-neutral-900 dark:bg-neutral-950 text-white px-4 py-2.5 flex items-center justify-between border-b-2 border-neutral-900 dark:border-neutral-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                  {nextEvent.status === 'en_curso' ? '🔴 EN VIVO' : `PRÓXIMO ${nextEvent.event_type.toUpperCase()}`}
                </span>
                {nextEvent.gender_category && (
                  <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20">
                    {nextEvent.gender_category === 'femenino' ? 'Femenino' : nextEvent.gender_category === 'masculino' ? 'Masculino' : 'Mixto'}
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase">
                ENTRY #{nextEvent.id.slice(0, 4)}
              </span>
            </div>

            {/* Ticket Body */}
            <div className="p-4 space-y-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-mono text-[11px] uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <span className="truncate">{nextEvent.location}</span>
                </div>
                <h3 className="font-display font-black text-2xl uppercase tracking-tight text-neutral-950 dark:text-white leading-tight mt-0.5">
                  {nextEvent.title}
                </h3>
              </div>

              {/* Scoreboard Date & Time Grid */}
              {(() => {
                const { weekday, day, month, time } = formatEventDate(nextEvent.start_time);
                return (
                  <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-neutral-800/60 p-2.5 rounded-2xl border border-neutral-300 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-display font-black text-sm text-neutral-900 dark:text-neutral-100 shadow-tactile-sm flex-shrink-0">
                        {day}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase block leading-none">Fecha</span>
                        <span className="font-display font-bold text-xs uppercase text-neutral-900 dark:text-neutral-100 truncate block mt-0.5">{weekday} • {month}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 shadow-tactile-sm flex-shrink-0">
                        <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase block leading-none">Kickoff</span>
                        <span className="font-mono font-extrabold text-xs text-neutral-900 dark:text-neutral-100 truncate block mt-0.5">{time} HRS</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Stadium Cupos & Progress Bar */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Convocatoria</span>
                  </span>
                  <span className="font-mono text-xs font-black text-neutral-900 dark:text-neutral-100">
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
                  <span className="font-display font-black text-base text-neutral-950 dark:text-white">
                    {nextEvent.total_cost && nextEvent.total_cost > 0
                      ? `~$${Math.round(nextEvent.total_cost / (maxCap || 14)).toLocaleString('es-CL')}`
                      : nextEvent.cost_per_player && nextEvent.cost_per_player > 0
                      ? `$${nextEvent.cost_per_player.toLocaleString('es-CL')}`
                      : 'Gratis'}
                    <span className="text-[10px] font-sans font-normal text-neutral-500 dark:text-neutral-400 ml-1">p/jugador</span>
                  </span>
                </div>

                <Link
                  href={`/eventos/${nextEvent.id}`}
                  className="btn-tactile bg-neutral-950 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-display text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  <span>Ver Ficha</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </Link>
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

        {/* ATHLETIC LOCKER CONSOLE (Accesos Rápidos) */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>El Vestuario</span>
              <span className="text-neutral-400 dark:text-neutral-500 font-sans font-normal text-xs">• Accesos del Club</span>
            </h2>
            <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-bold">
              Consola
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Partidos & Fixture */}
            <Link
              href="/eventos"
              className="btn-tactile bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile flex flex-col justify-between gap-3 min-h-[105px]"
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-neutral-900 dark:border-neutral-700 shadow-tactile-sm"
                  style={{
                    backgroundColor: 'var(--club-primary, #059669)',
                    color: '#ffffff',
                  }}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                  Fixture
                </span>
              </div>
              <div>
                <p className="font-display text-base font-black text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
                  Partidos & Eventos
                </p>
                <p className="font-sans text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Convocatorias y cupos
                </p>
              </div>
            </Link>

            {/* Finanzas & Tercer Tiempo */}
            <Link
              href="/finanzas"
              className="btn-tactile bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile flex flex-col justify-between gap-3 min-h-[105px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center border border-neutral-900 dark:border-neutral-700 shadow-tactile-sm">
                  <Wallet className="w-4 h-4" />
                </div>
                {pendingDebtsCount > 0 ? (
                  <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {pendingDebtsCount} Pendiente{pendingDebtsCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Al Día ✓
                  </span>
                )}
              </div>
              <div>
                <p className="font-display text-base font-black text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
                  Finanzas & Cuotas
                </p>
                <p className="font-sans text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Tesorero y estado de cuenta
                </p>
              </div>
            </Link>

            {/* Plantel del Club */}
            <Link
              href="/miembros"
              className="btn-tactile bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile flex flex-col justify-between gap-3 min-h-[105px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center border border-neutral-900 dark:border-neutral-700 shadow-tactile-sm">
                  <Users className="w-4 h-4" />
                </div>
                {clubMembersCount !== null && (
                  <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                    {clubMembersCount} Socios
                  </span>
                )}
              </div>
              <div>
                <p className="font-display text-base font-black text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
                  Plantel Oficial
                </p>
                <p className="font-sans text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Directorio de jugadores
                </p>
              </div>
            </Link>

            {/* Salón de la Fama / Ranking MVP */}
            <Link
              href="/ranking"
              className="btn-tactile bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile flex flex-col justify-between gap-3 min-h-[105px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center border border-neutral-900 dark:border-neutral-700 shadow-tactile-sm">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Hall of Fame
                </span>
              </div>
              <div>
                <p className="font-display text-base font-black text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
                  Ranking & MVPs
                </p>
                <p className="font-sans text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Líderes y podio del club
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* GitHub Collaboration Footer */}
        <div className="mt-4 pt-4 border-t-2 border-neutral-900/10 dark:border-white/10 text-center space-y-2">
          <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            CampApp • Plataforma Oficial de Club Deportivo
          </p>
          <div>
            <a
              href="https://github.com/Aspirador4/NewCampApp"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactile inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-neutral-950 dark:bg-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-800/80 text-white text-xs font-bold transition shadow-tactile-sm border border-neutral-900 dark:border-neutral-700 min-h-[40px]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span className="font-mono text-xs">Repositorio en GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
