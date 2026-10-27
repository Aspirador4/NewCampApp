import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getActiveClub } from '@/utils/club'
import { EditClubForm } from '@/components/EditClubForm'

export const metadata = {
  title: 'Editar Club | CampApp',
  description: 'Edita el nombre, escudo y colores institucionales de tu club deportivo.',
}

export default async function EditarClubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/club/editar')
  }

  // Get active club & check admin permissions
  const { club, isAdmin, isApproved } = await getActiveClub(supabase)

  if (!isApproved) {
    redirect('/')
  }

  if (!isAdmin) {
    redirect('/')
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      <EditClubForm club={club} />
    </div>
  )
}
