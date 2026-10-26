import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // If a magic link or OAuth code was sent to root or another page, redirect to auth callback
  const hasAuthCode = request.nextUrl.searchParams.has('code') || request.nextUrl.searchParams.has('token_hash')
  if (hasAuthCode && !pathname.startsWith('/auth/callback')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.search = request.nextUrl.search
    return NextResponse.redirect(callbackUrl)
  }

  // Protected routes that require authentication
  const isProtected =
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/eventos') ||
    pathname.startsWith('/ranking') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/finanzas') ||
    pathname.startsWith('/miembros')

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is logged in and visits login page, redirect to home
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json / sw.js / icons
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
