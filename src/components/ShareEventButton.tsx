'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

interface ShareEventButtonProps {
  eventId: string
  title: string
  eventType: string
  startFormatted: string
  location: string
  costFormatted: string
  confirmedCount: number
  maxCapacity: number | null
}

export function ShareEventButton({
  eventId,
  title,
  eventType,
  startFormatted,
  location,
  costFormatted,
  confirmedCount,
  maxCapacity,
}: ShareEventButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://camp-app.vercel.app'
    const eventUrl = `${origin}/eventos/${eventId}`

    const typeEmoji = eventType === 'partido' ? '⚽' : eventType === 'entrenamiento' ? '🏃' : '✨'

    const message = `${typeEmoji} *${title}*
📅 *Fecha:* ${startFormatted}
📍 *Lugar:* ${location}
💰 *Costo:* ${costFormatted}
👥 *Confirmados:* ${confirmedCount}${maxCapacity ? `/${maxCapacity} cupos` : ''}

👉 *¡Anotate en la app acá!*:
${eventUrl}`

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`

    // If mobile navigator.share is available, we can trigger it or open WhatsApp directly
    if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      navigator.share({
        title: title,
        text: message,
      }).catch(() => {
        window.open(whatsappUrl, '_blank')
      })
    } else {
      window.open(whatsappUrl, '_blank')
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="btn-tactile inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-neutral-900 bg-[#25D366] hover:bg-[#20ba5a] text-neutral-950 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition active:scale-95"
      title="Compartir por WhatsApp"
    >
      {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />}
      <span>{copied ? '¡Compartido!' : 'Compartir Convocatoria'}</span>
    </button>
  )
}
