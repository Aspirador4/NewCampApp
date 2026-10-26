import { createClient } from "@/utils/supabase/server";
import { Flame, ArrowRight, UserCircle2, Calendar, MapPin, Users, Wallet, Trophy } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  // Fetch next upcoming event
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select(`
      *,
      event_attendees (
        id,
        status
      ),
      event_guests (
        id,
        status
      )
    `)
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
    <div className="flex-1 flex flex-col p-5 pb-24">
      {/* Mobile Header */}
      <header className="pt-4 pb-5 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-neutral-900">
                Club Deportivo
              </h1>
              <p className="text-xs text-neutral-500 font-medium">
                App Oficial
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Temporada 2026
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 py-4 flex flex-col gap-4">
        {/* User Card */}
        {user ? (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">
                  Socio Activo
                </p>
                <p className="text-sm font-bold text-neutral-900">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-[11px] text-neutral-500 capitalize">
                  {profile?.custom_attributes && typeof profile.custom_attributes === 'object' && 'posicion' in profile.custom_attributes && (profile.custom_attributes as Record<string, unknown>).posicion
                    ? Array.isArray((profile.custom_attributes as Record<string, unknown>).posicion)
                      ? ((profile.custom_attributes as Record<string, unknown>).posicion as string[]).join(', ')
                      : String((profile.custom_attributes as Record<string, unknown>).posicion)
                    : `Rol: ${profile?.sports_role || 'Jugador'}`}
                </p>
              </div>
            </div>
            <Link
              href="/perfil"
              className="p-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition shadow-xs"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-5 shadow-md flex flex-col gap-3">
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-white inline-block mb-2">
                Acceso Exclusivo
              </span>
              <h2 className="text-lg font-extrabold leading-snug">
                Bienvenido al Club Deportivo
              </h2>
              <p className="text-xs text-emerald-100 mt-1">
                Inicia sesión con tu correo o Google para confirmar asistencias, entrar a listas de espera y votar MVP.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-emerald-800 font-bold text-xs shadow-sm hover:bg-emerald-50 transition active:scale-[0.98]"
            >
              <UserCircle2 className="w-4 h-4" />
              <span>Ingresar o Registrarse</span>
            </Link>
          </div>
        )}

        {/* Next Event Highlight Card */}
        {nextEvent ? (
          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 tracking-wider">
                Próximo {nextEvent.event_type}
              </span>
              <Link
                href={`/eventos/${nextEvent.id}`}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Ver Convocatoria</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div>
              <h3 className="font-bold text-base text-neutral-900 leading-tight">
                {nextEvent.title}
              </h3>
              <div className="mt-2 space-y-1 text-xs text-neutral-600">
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
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-500">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">
                  Explorar Convocatorias
                </p>
                <p className="text-[11px] text-neutral-500">
                  Revisa los próximos partidos y entrenamientos
                </p>
              </div>
            </div>
            <Link
              href="/eventos"
              className="p-2 rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Quick Access Menu Cards */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider px-1">
            Accesos Rápidos
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/eventos"
              className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between gap-2"
            >
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 w-fit">
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
              className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between gap-2"
            >
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 w-fit">
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
              href="/ranking"
              className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between gap-2"
            >
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 w-fit">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900 leading-tight">
                  Ranking & MVPs
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Tabla de líderes del club
                </p>
              </div>
            </Link>

            <Link
              href="/perfil"
              className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between gap-2"
            >
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 w-fit">
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

        {/* GitHub Collaboration Button */}
        <div className="mt-4 pt-4 border-t border-neutral-200 text-center space-y-2">
          <p className="text-[11px] text-neutral-500">
            ¿Quieres proponer ideas o colaborar con código?
          </p>
          <div>
            <a
              href="https://github.com/Aspirador4/NewCampApp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition active:scale-95 shadow-xs"
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
