'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { SportsRole } from '@/types/database.types'

export async function signInWithOtp(formData: FormData) {
  const email = formData.get('email') as string
  if (!email || !email.includes('@')) {
    return { error: 'Por favor ingresa un correo electrónico válido' }
  }

  const supabase = await createClient()
  const headerList = await headers()
  const origin = headerList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/perfil`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Enlace mágico enviado. Revisa tu bandeja de entrada.' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado. Por favor inicia sesión.' }
  }

  const fullName = formData.get('full_name') as string
  const birthDate = (formData.get('birth_date') as string) || null
  const sportsRole = (formData.get('sports_role') as SportsRole) || 'jugador'
  const customAttributesRaw = formData.get('custom_attributes') as string

  let customAttributes = {}
  if (customAttributesRaw) {
    try {
      customAttributes = JSON.parse(customAttributesRaw)
    } catch {
      return { error: 'Formato inválido de atributos personalizados' }
    }
  }

  if (!fullName || fullName.trim().length === 0) {
    return { error: 'El nombre completo es requerido' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName.trim(),
      birth_date: birthDate || null,
      sports_role: sportsRole,
      custom_attributes: customAttributes,
    })
    .eq('id', user.id)

  if (error) {
    return { error: `Error al actualizar el perfil: ${error.message}` }
  }

  revalidatePath('/perfil')
  revalidatePath('/')
  return { success: true, message: 'Perfil actualizado correctamente' }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) {
    return { error: 'No se seleccionó ningún archivo' }
  }

  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'La imagen no debe superar los 5MB' }
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  if (!allowedExts.includes(fileExt)) {
    return { error: 'Formato no soportado. Usa JPG, PNG o WebP.' }
  }

  const filePath = `${user.id}/${Date.now()}.${fileExt}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    return { error: `Error al subir la imagen: ${uploadError.message}` }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // Update profile avatar_url
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (updateError) {
    return { error: `Error al asociar el avatar: ${updateError.message}` }
  }

  revalidatePath('/perfil')
  revalidatePath('/')
  return { success: true, avatarUrl: publicUrl }
}
