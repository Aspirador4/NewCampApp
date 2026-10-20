import { createClient } from "@/utils/supabase/server";
import { ShieldCheck, Database, Smartphone, Flame } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex-1 flex flex-col p-5">
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
            Fase 1 OK
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 py-6 flex flex-col gap-5">
        {/* Architecture Specs Card */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider mb-3">
            Estado del Sistema
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">
                  Next.js 15 + App Router
                </p>
                <p className="text-xs text-neutral-500">
                  TypeScript, Tailwind CSS y ESLint activos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">
                  Supabase SSR & Migraciones SQL
                </p>
                <p className="text-xs text-neutral-500">
                  Esquema completo con 9 tablas, RLS e índices
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">
                  Mobile-First Viewport
                </p>
                <p className="text-xs text-neutral-500">
                  Optimizado para smartphones y standalone PWA
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Database Migration Checklist */}
        <div className="bg-neutral-900 text-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Tablas del Modelo Mutable
          </p>
          <p className="text-xs text-neutral-400 mb-3">
            Definidas en <code className="text-neutral-200">001_initial_schema.sql</code>
          </p>
          <ul className="text-xs space-y-1.5 font-mono text-neutral-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              profiles (+ custom_attributes JSONB)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              profile_field_definitions
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              events & event_attendees (cupos)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              event_guests (moderación)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              event_attendance_logs (auditoría)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              mvp_votes & user_stats (métricas mutables)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              push_subscriptions (Web Push VAPID)
            </li>
          </ul>
        </div>

        {/* User Session Info */}
        <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-200 text-center">
          <p className="text-xs text-neutral-600">
            {user ? `Sesión iniciada como: ${user.email}` : "Sin sesión activa (Listo para Fase 2: Auth)"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 text-center border-t border-neutral-200 text-xs text-neutral-400">
        Club Deportivo &bull; Arquitectura Next.js 15 + Supabase
      </footer>
    </div>
  );
}
