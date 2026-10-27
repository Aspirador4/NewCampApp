'use client'

import { useState } from 'react'
import { CalendarPlus, ExternalLink, Download, Check, ChevronDown } from 'lucide-react'

interface AddToCalendarButtonProps {
  title: string
  description: string | null
  location: string
  startTime: string
  endTime?: string | null
}

export function AddToCalendarButton({
  title,
  description,
  location,
  startTime,
  endTime,
}: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const startDate = new Date(startTime)
  const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 90 * 60 * 1000) // Default 90 min match

  const formatToIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const startIcs = formatToIcsDate(startDate)
  const endIcs = formatToIcsDate(endDate)

  // 1. Google Calendar URL
  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${startIcs}/${endIcs}&details=${encodeURIComponent(
    description || 'Convocatoria oficial Club Deportivo'
  )}&location=${encodeURIComponent(location)}`

  // 2. Apple / Outlook / iCal Download
  const handleDownloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Club Deportivo//CampApp//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${startDate.getTime()}-${Math.random().toString(36).substring(2, 9)}@campapp.club`,
      `DTSTAMP:${formatToIcsDate(new Date())}`,
      `DTSTART:${startIcs}`,
      `DTEND:${endIcs}`,
      `SUMMARY:${title.replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:${(description || 'Convocatoria oficial').replace(/\n/g, '\\n')}`,
      `LOCATION:${location.replace(/[,;]/g, ' ')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setDownloaded(true)
    setTimeout(() => {
      setDownloaded(false)
      setIsOpen(false)
    }, 2000)
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-tactile inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#14161f] hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-950 dark:text-white border-2 border-neutral-900 dark:border-neutral-700 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm transition active:scale-95"
      >
        <CalendarPlus className="w-3.5 h-3.5 text-neutral-900 dark:text-white stroke-[2.5]" />
        <span>Calendario</span>
        <ChevronDown className="w-3 h-3 text-neutral-500 dark:text-neutral-400 stroke-[2.5]" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#14161f] border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-950 dark:text-white font-display font-bold uppercase tracking-wider transition"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-neutral-900 dark:border-neutral-700" />
                <span>Google Calendar</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            </a>

            <button
              type="button"
              onClick={handleDownloadIcs}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-950 dark:text-white font-display font-bold uppercase tracking-wider transition text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-neutral-900 dark:border-neutral-700" />
                <span>Apple / Outlook (.ics)</span>
              </div>
              {downloaded ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
