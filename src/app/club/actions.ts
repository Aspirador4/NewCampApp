'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { ACTIVE_CLUB_COOKIE } from '@/types/club.types'

export async function createClubAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para crear un club' }
  }

  const name = (formData.get('name') as string)?.trim()
  const slugRaw = (formData.get('slug') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const logoUrl = (formData.get('logo_url') as string)?.trim() || null

  if (!name || !slugRaw) {
    return { error: 'El nombre y el identificador (slug) son obligatorios' }
  }

  const slug = slugRaw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (slug.length < 3) {
    return { error: 'El slug debe tener al menos 3 caracteres válidos' }
  }

  // Use atomic RPC create_new_club
  const { data, error } = await supabase.rpc('create_new_club', {
    p_name: name,
    p_slug: slug,
    p_description: description || undefined,
    p_logo_url: logoUrl || undefined,
  })

  if (error) {
    // If RPC is missing or fails, fallback to manual insert
    const { data: existingClub } = await supabase
      .from('clubs')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingClub) {
      return { error: `El identificador "${slug}" ya está en uso. Por favor elige otro.` }
    }

    const { data: newClub, error: insertErr } = await supabase
      .from('clubs')
      .insert({
        name,
        slug,
        description,
        logo_url: logoUrl,
        created_by: user.id,
        settings: {
          bank_details: {
            banco: '',
            tipo_cuenta: '',
            numero_cuenta: '',
            titular: '',
            rut: '',
            email: '',
          },
        },
      })
      .select('id')
      .single()

    if (insertErr || !newClub) {
      return { error: `Error al crear club: ${insertErr?.message || 'Error desconocido'}` }
    }

    // Insert creator as admin
    await supabase.from('club_members').insert({
      club_id: newClub.id,
      user_id: user.id,
      system_role: 'admin',
      sports_role: 'jugador',
      approval_status: 'aprobado',
    })

    // Seed stats
    await supabase.from('user_stats').insert({
      user_id: user.id,
      club_id: newClub.id,
    })

    // Seed dynamic profile fields
    await supabase.from('profile_field_definitions').insert([
      {
        club_id: newClub.id,
        field_key: 'posicion',
        label: 'Posición habitual',
        field_type: 'select',
        options: ['Arquero', 'Defensor', 'Mediocampista', 'Delantero'],
        is_required: false,
        display_order: 1,
      },
      {
        club_id: newClub.id,
        field_key: 'numero_camiseta',
        label: 'Número de camiseta preferido',
        field_type: 'number',
        options: [],
        is_required: false,
        display_order: 2,
      },
      {
        club_id: newClub.id,
        field_key: 'pie_habil',
        label: 'Pie hábil',
        field_type: 'select',
        options: ['Derecho', 'Izquierdo', 'Ambidiestro'],
        is_required: false,
        display_order: 3,
      },
    ])

    // Set cookie to active club
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_CLUB_COOKIE, newClub.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    revalidatePath('/', 'layout')
    redirect('/')
  }

  const resultClubId = (data as { club_id?: string })?.club_id
  if (resultClubId) {
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_CLUB_COOKIE, resultClubId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function joinClubAction(clubId: string, motivationText?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para unirte a un club' }
  }

  const cleanMotivation = motivationText ? motivationText.trim().slice(0, 100) : null

  // Try RPC request_join_club
  const { data, error } = await supabase.rpc('request_join_club', {
    p_club_id: clubId,
    p_motivation: cleanMotivation || undefined,
  })

  if (error) {
    // Fallback: direct insert / upsert into club_members
    const { error: upsertErr } = await supabase
      .from('club_members')
      .upsert(
        {
          club_id: clubId,
          user_id: user.id,
          system_role: 'member',
          sports_role: 'jugador',
          approval_status: 'pendiente',
          motivation: cleanMotivation,
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'club_id,user_id' }
      )

    if (upsertErr) {
      return { error: upsertErr.message }
    }

    await supabase
      .from('user_stats')
      .upsert({ user_id: user.id, club_id: clubId }, { onConflict: 'user_id,club_id' })
  }

  // Set as active club so user can follow their application
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_CLUB_COOKIE, clubId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  revalidatePath('/', 'layout')
  return { success: true, data }
}

export async function switchClubAction(clubId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_CLUB_COOKIE, clubId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
