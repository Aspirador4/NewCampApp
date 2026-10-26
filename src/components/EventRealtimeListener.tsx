'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface EventRealtimeListenerProps {
  eventId: string
}

export function EventRealtimeListener({ eventId }: EventRealtimeListenerProps) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to changes on attendees and guests for this specific event
    const channel = supabase
      .channel(`event-realtime-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_guests',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, router])

  return null
}
