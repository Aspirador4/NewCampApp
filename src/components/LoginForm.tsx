'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { signInWithOtp } from '@/app/auth/actions'
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('email', email)

    const res = await signInWithOtp(formData)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.success) {
      setMessage(res.message || 'Enlace enviado a tu correo.')
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)
    const supabase = createClient()
    const origin = window.location.origin

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=/perfil`,
      },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full space-y-5">
      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm shadow-sm transition active:scale-[0.98] disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>Continuar con Google</span>
      </button>

      {/* Divider */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-neutral-200"></div>
        <span className="flex-shrink mx-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          O con tu email
        </span>
        <div className="flex-grow border-t border-neutral-200"></div>
      </div>

      {/* Magic Link Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-neutral-700 mb-1.5">
            Correo electrónico
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="socio@clubdeportivo.com"
              className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-neutral-300 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white"
            />
          </div>
        </div>

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

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Enviar enlace mágico</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
