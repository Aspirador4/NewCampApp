import { createClient } from "@/utils/supabase/server";
import { ShieldCheck, Database, Smartphone, Flame, ArrowRight, UserCircle2 } from "lucide-react";
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

  return (
    <div className="flex-1 flex flex-col p-5 pb-24">
      {/* Mobile Header */}
      <header className="pt-4 pb-6 border-b border-neutral-200">
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
                PWA Mobile-First
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Fase 2 OK
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 py-5 flex flex-col gap-4">
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
                  Rol: {profile?.sports_role || 'Jugador'}
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
                Inicia sesión con tu correo o Google para acceder a los partidos, confirmar asistencias y votar al MVP.
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

        {/* System Status Card */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm">
          <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3">
            Módulos Implementados
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900">
                  Autenticación & Perfil Mutable
                </p>
                <p className="text-xs text-neutral-500">
                  Magic link, Google OAuth, avatar a Storage y campos JSONB dinámicos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900">
                  Supabase SSR & DDL
                </p>
                <p className="text-xs text-neutral-500">
                  Tablas, RLS, triggers y RPCs atómicos en <code>001_initial_schema.sql</code>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900">
                  Mobile PWA & BottomNav
                </p>
                <p className="text-xs text-neutral-500">
                  Navegación móvil nativa lista para partidos y estadísticas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wiki Link Card */}
        <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Documentación Técnica
            </p>
            <p className="text-xs text-neutral-300 mt-0.5">
              Wiki viva centralizada en <code>docs/wiki/</code>
            </p>
          </div>
          <Link
            href="/perfil"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Ver perfil</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
