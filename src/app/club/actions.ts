'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { ACTIVE_CLUB_COOKIE } from '@/types/club.types'
import { sendPushToClubAdmins } from '@/app/api/push/actions'

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
  const paletteId = (formData.get('palette_id') as string)?.trim() || 'emerald'

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

  let finalClubId: string | null = null

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
          palette: paletteId,
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

    finalClubId = newClub.id

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
  } else {
    finalClubId = (data as { club_id?: string })?.club_id || null

    // If RPC succeeded, update the settings with the selected palette
    if (finalClubId && paletteId) {
      const { data: currentClub } = await supabase
        .from('clubs')
        .select('settings')
        .eq('id', finalClubId)
        .single()

      const currentSettings = (currentClub?.settings as Record<string, unknown>) || {}
      await supabase
        .from('clubs')
        .update({
          settings: {
            ...currentSettings,
            palette: paletteId,
          },
        })
        .eq('id', finalClubId)
    }
  }

  if (finalClubId) {
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_CLUB_COOKIE, finalClubId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateClubThemeAction(clubId: string, paletteId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Verify admin permissions in club
  const { data: membership } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .single()

  if (membership?.system_role !== 'admin' || membership?.approval_status !== 'aprobado') {
    return { error: 'Solo los administradores pueden cambiar los colores del club.' }
  }

  const { data: currentClub } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', clubId)
    .single()

  const currentSettings = (currentClub?.settings as Record<string, unknown>) || {}
  const { error } = await supabase
    .from('clubs')
    .update({
      settings: {
        ...currentSettings,
        palette: paletteId,
      },
    })
    .eq('id', clubId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
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

  // Notify club admins of new membership application
  try {
    const { data: targetClub } = await supabase.from('clubs').select('name').eq('id', clubId).single()
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const clubName = targetClub?.name || 'Club Deportivo'
    const applicantName = profile?.full_name || 'Un socio'

    await sendPushToClubAdmins(
      clubId,
      {
        title: `[${clubName}] 📋 Nueva Solicitud de Pase`,
        body: `${applicantName} ha solicitado ingresar al club. Revisa su postulación en Miembros.`,
        url: '/miembros',
        type: 'admin',
        clubId,
      },
      user.id
    )
  } catch (pushErr) {
    console.error('Error notifying admins on joinClubAction:', pushErr)
  }

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

export async function uploadClubLogoAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para subir una imagen' }
  }

  const file = formData.get('logo') as File
  if (!file || file.size === 0) {
    return { error: 'No se seleccionó ningún archivo' }
  }

  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'La imagen no debe superar los 5MB' }
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'svg']
  if (!allowedExts.includes(fileExt)) {
    return { error: 'Formato no soportado. Usa JPG, PNG, WebP o SVG.' }
  }

  const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('club-logos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    return { error: `Error al subir la imagen: ${uploadError.message}` }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('club-logos')
    .getPublicUrl(filePath)

  return { success: true, logoUrl: publicUrl }
}
