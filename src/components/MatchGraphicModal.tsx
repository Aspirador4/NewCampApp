'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Download,
  Share2,
  Trophy,
  Users,
  Loader2,
} from 'lucide-react'
import { LiveMatchTeam } from './LiveMatchTrackerModal'

interface MatchGraphicModalProps {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  eventDate?: string
  eventLocation?: string
  clubName?: string
  clubLogo?: string | null
  clubPrimaryColor?: string
  teams: LiveMatchTeam[]
  resultRecorded?: boolean
}

type GraphicMode = 'nomina' | 'resultado'
type GraphicFormat = 'story' | 'feed' // story: 1080x1920, feed: 1080x1080

export function MatchGraphicModal({
  isOpen,
  onClose,
  eventTitle,
  eventDate,
  eventLocation,
  clubName = 'CLUB DEPORTIVO',
  clubLogo,
  clubPrimaryColor = '#059669',
  teams,
  resultRecorded = false,
}: MatchGraphicModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [mode, setMode] = useState<GraphicMode>(() =>
    resultRecorded || (teams[0]?.score !== null && teams[1]?.score !== null)
      ? 'resultado'
      : 'nomina'
  )
  const [format, setFormat] = useState<GraphicFormat>('story')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const team1 = teams[0]
  const team2 = teams[1]

  const drawGraphic = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsGenerating(true)

    const isStory = format === 'story'
    const W = 1080
    const H = isStory ? 1920 : 1080

    canvas.width = W
    canvas.height = H

    // Wait for fonts to be ready
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready
      } catch {}
    }

    const primary = clubPrimaryColor || '#059669'

    // Helper to truncate text safely within bounds
    const fitText = (text: string, maxWidth: number) => {
      if (ctx.measureText(text).width <= maxWidth) return text
      let t = text
      while (t.length > 3 && ctx.measureText(t + '...').width > maxWidth) {
        t = t.slice(0, -1)
      }
      return t + '...'
    }

    // 1. Background: Deep modern dark with subtle club color gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#090a0f')
    bg.addColorStop(0.5, '#10121a')
    bg.addColorStop(1, '#08090d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Soft subtle radial glow in the upper-center matching the club primary color
    const glow = ctx.createRadialGradient(W / 2, isStory ? 520 : 380, 50, W / 2, isStory ? 520 : 380, 600)
    glow.addColorStop(0, `${primary}22`) // ~13% opacity
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    // Sleek outer border with rounded corners
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(40, 40, W - 80, H - 80, 36)
    ctx.stroke()

    // 2. Club Header
    let curY = isStory ? 120 : 80
    ctx.textAlign = 'center'

    // Logo (if available)
    if (clubLogo) {
      try {
        const logoImg = new window.Image()
        logoImg.crossOrigin = 'anonymous'
        logoImg.src = clubLogo
        await new Promise((resolve) => {
          logoImg.onload = resolve
          logoImg.onerror = resolve
        })
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const logoSize = isStory ? 90 : 70
          ctx.save()
          ctx.beginPath()
          ctx.arc(W / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(logoImg, W / 2 - logoSize / 2, curY, logoSize, logoSize)
          ctx.restore()
          curY += logoSize + 20
        }
      } catch {}
    }

    // Club Name
    ctx.font = 'bold 36px "Barlow", -apple-system, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(fitText(clubName.toUpperCase(), W - 160), W / 2, curY)

    // Mode Pill Badge (e.g. "RESULTADO FINAL" / "NÓMINA OFICIAL")
    curY += 34
    const pillText = mode === 'nomina' ? 'NÓMINA OFICIAL' : 'RESULTADO FINAL'
    ctx.font = '800 22px "Barlow", sans-serif'
    const pillW = ctx.measureText(pillText).width + 36
    const pillH = 38
    ctx.fillStyle = `${primary}28`
    ctx.strokeStyle = primary
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(W / 2 - pillW / 2, curY, pillW, pillH, 19)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.fillText(pillText, W / 2, curY + 26)

    // Match Title
    curY += pillH + (isStory ? 45 : 30)
    ctx.font = 'bold 32px "Barlow", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(fitText(eventTitle, W - 160), W / 2, curY)

    // Match Details (Date & Venue cleanly on two separate lines, never overflowing!)
    curY += 36
    ctx.font = '500 22px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'

    if (eventDate) {
      ctx.fillText(fitText(`📅 ${eventDate}`, W - 160), W / 2, curY)
      curY += 30
    }
    if (eventLocation) {
      ctx.fillText(fitText(`📍 ${eventLocation}`, W - 160), W / 2, curY)
      curY += 25
    }

    // Horizontal Accent Line
    curY += 15
    const lineGrad = ctx.createLinearGradient(W / 2 - 180, 0, W / 2 + 180, 0)
    lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
    lineGrad.addColorStop(0.5, primary)
    lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = lineGrad
    ctx.fillRect(W / 2 - 180, curY, 360, 2)

    // 3. Mode Content
    if (mode === 'resultado') {
      // --- RESULT MODE ---
      curY += isStory ? 80 : 45

      const score1 = team1?.score ?? 0
      const score2 = team2?.score ?? 0

      // Match Scoreboard Center Box
      const cardW = 900
      const cardH = isStory ? 260 : 200
      const cardX = (W - cardW) / 2
      const cardY = curY

      // Card Background
      ctx.fillStyle = '#141620'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(cardX, cardY, cardW, cardH, 28)
      ctx.fill()
      ctx.stroke()

      // Team 1 (Left)
      const t1CenterX = cardX + cardW * 0.26
      // Color Dot + Name
      ctx.fillStyle = team1?.color || '#ffffff'
      ctx.beginPath()
      ctx.arc(t1CenterX - ctx.measureText(team1?.name || '').width / 2 - 14, cardY + 55, 7, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = 'bold 32px "Barlow", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(fitText(team1?.name || 'Equipo A', 280), t1CenterX, cardY + 65)

      // Score 1
      ctx.font = '900 120px -apple-system, "Barlow", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(String(score1), t1CenterX, cardY + cardH - 35)

      // Center VS
      ctx.font = 'bold 24px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.fillText('VS', W / 2, cardY + cardH / 2 + 8)

      // Team 2 (Right)
      const t2CenterX = cardX + cardW * 0.74
      ctx.fillStyle = team2?.color || '#333333'
      ctx.beginPath()
      ctx.arc(t2CenterX - ctx.measureText(team2?.name || '').width / 2 - 14, cardY + 55, 7, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = 'bold 32px "Barlow", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(fitText(team2?.name || 'Equipo B', 280), t2CenterX, cardY + 65)

      // Score 2
      ctx.font = '900 120px -apple-system, "Barlow", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(String(score2), t2CenterX, cardY + cardH - 35)

      // Scorers Card (Goleadores)
      curY += cardH + (isStory ? 55 : 30)

      const scorersT1 = (team1?.players || []).filter((p) => (p.goals || 0) > 0)
      const scorersT2 = (team2?.players || []).filter((p) => (p.goals || 0) > 0)
      const hasAnyGoals = scorersT1.length > 0 || scorersT2.length > 0

      const gCardW = 900
      const gCardH = isStory ? 560 : 340
      const gCardX = (W - gCardW) / 2

      ctx.fillStyle = '#11131a'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(gCardX, curY, gCardW, gCardH, 24)
      ctx.fill()
      ctx.stroke()

      // Header inside Goleadores
      ctx.font = 'bold 22px "Barlow", sans-serif'
      ctx.fillStyle = primary
      ctx.fillText('⚽ GOLEADORES', W / 2, curY + 45)

      let listY = curY + 105
      if (!hasAnyGoals) {
        ctx.font = '500 24px "Barlow", sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.fillText('Sin goles registrados', W / 2, curY + gCardH / 2)
      } else {
        // Left Column (Team 1)
        ctx.textAlign = 'left'
        ctx.font = '600 24px "Barlow", sans-serif'
        ctx.fillStyle = '#ffffff'

        if (scorersT1.length > 0) {
          scorersT1.forEach((p) => {
            if (listY > curY + gCardH - 40) return
            ctx.fillText(fitText(`• ${p.fullName}: ${p.goals} gol(es)`, 380), gCardX + 50, listY)
            listY += 40
          })
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
          ctx.fillText(`• ${team1?.name}: Sin goles`, gCardX + 50, listY)
        }

        // Right Column (Team 2)
        listY = curY + 105
        ctx.fillStyle = '#ffffff'
        if (scorersT2.length > 0) {
          scorersT2.forEach((p) => {
            if (listY > curY + gCardH - 40) return
            ctx.fillText(fitText(`• ${p.fullName}: ${p.goals} gol(es)`, 380), gCardX + gCardW / 2 + 30, listY)
            listY += 40
          })
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
          ctx.fillText(`• ${team2?.name}: Sin goles`, gCardX + gCardW / 2 + 30, listY)
        }
      }
    } else {
      // --- NOMINA (LINEUP) MODE ---
      curY += isStory ? 55 : 25

      const colW = 430
      const colH = isStory ? 1160 : 640
      const gap = 36
      const startX = (W - (colW * 2 + gap)) / 2

      // Team 1 Card
      ctx.fillStyle = '#141620'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(startX, curY, colW, colH, 24)
      ctx.fill()
      ctx.stroke()

      // Header Team 1
      ctx.textAlign = 'center'
      ctx.font = 'bold 28px "Barlow", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(fitText(team1?.name?.toUpperCase() || 'EQUIPO 1', colW - 60), startX + colW / 2, curY + 50)

      // Team 1 line
      ctx.fillStyle = team1?.color || '#ffffff'
      ctx.fillRect(startX + colW / 2 - 30, curY + 65, 60, 4)

      let pY = curY + 115
      ctx.textAlign = 'left'
      ;(team1?.players || []).forEach((p, i) => {
        if (pY > curY + colH - 40) return
        ctx.font = 'bold 22px "Barlow", sans-serif'
        ctx.fillStyle = primary
        ctx.fillText(`${i + 1}.`, startX + 30, pY)

        ctx.font = '600 22px "Barlow", sans-serif'
        ctx.fillStyle = '#ffffff'
        // Strictly only player name, NO positions!
        ctx.fillText(fitText(p.fullName, colW - 90), startX + 65, pY)

        pY += isStory ? 48 : 36
      })

      // Team 2 Card
      const startX2 = startX + colW + gap
      ctx.fillStyle = '#141620'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(startX2, curY, colW, colH, 24)
      ctx.fill()
      ctx.stroke()

      // Header Team 2
      ctx.textAlign = 'center'
      ctx.font = 'bold 28px "Barlow", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(fitText(team2?.name?.toUpperCase() || 'EQUIPO 2', colW - 60), startX2 + colW / 2, curY + 50)

      // Team 2 line
      ctx.fillStyle = team2?.color || '#111111'
      ctx.fillRect(startX2 + colW / 2 - 30, curY + 65, 60, 4)

      pY = curY + 115
      ctx.textAlign = 'left'
      ;(team2?.players || []).forEach((p, i) => {
        if (pY > curY + colH - 40) return
        ctx.font = 'bold 22px "Barlow", sans-serif'
        ctx.fillStyle = primary
        ctx.fillText(`${i + 1}.`, startX2 + 30, pY)

        ctx.font = '600 22px "Barlow", sans-serif'
        ctx.fillStyle = '#ffffff'
        // Strictly only player name, NO positions!
        ctx.fillText(fitText(p.fullName, colW - 90), startX2 + 65, pY)

        pY += isStory ? 48 : 36
      })
    }

    // 4. Footer Branding
    ctx.textAlign = 'center'
    ctx.font = '600 20px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillText(`${clubName.toUpperCase()} • CAMPAPP`, W / 2, H - 65)

    setIsGenerating(false)
  }, [clubLogo, clubName, clubPrimaryColor, eventDate, eventLocation, eventTitle, format, mode, team1, team2])

  // Re-draw when options change or modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        drawGraphic()
      }, 80)
    }
  }, [isOpen, drawGraphic])

  // Download image
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    const safeTitle = eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')
    link.download = `${mode}-${safeTitle}-${format}.png`
    link.href = dataUrl
    link.click()
  }

  // Web Share API
  const handleShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], `${mode}-${format}.png`, { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: eventTitle,
            text: `${clubName} — ${mode === 'nomina' ? 'Convocatoria Oficial' : 'Resultado Final'}`,
            files: [file],
          })
          return
        } catch {}
      }

      // Fallback: download
      handleDownload()
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center sm:p-4">
      <div className="bg-neutral-950 border-2 border-neutral-800 text-white w-full sm:max-w-2xl max-h-[92vh] sm:rounded-3xl rounded-t-3xl shadow-tactile flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm">
              📸
            </span>
            <div>
              <h2 className="font-display font-bold text-base uppercase tracking-tight text-white">
                Generador de Gráficas
              </h2>
              <p className="font-mono text-[10px] text-neutral-400">
                Instagram Stories & Feed PNG
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option Toggles */}
        <div className="p-3 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setMode('nomina')}
              className={`py-1 px-3 rounded-lg font-display font-bold text-xs uppercase flex items-center gap-1.5 transition ${
                mode === 'nomina'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Nómina</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('resultado')}
              className={`py-1 px-3 rounded-lg font-display font-bold text-xs uppercase flex items-center gap-1.5 transition ${
                mode === 'resultado'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Resultado</span>
            </button>
          </div>

          {/* Format Switcher */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setFormat('story')}
              className={`py-1 px-3 rounded-lg font-mono text-[11px] font-bold uppercase transition ${
                format === 'story'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Story 9:16
            </button>
            <button
              type="button"
              onClick={() => setFormat('feed')}
              className={`py-1 px-3 rounded-lg font-mono text-[11px] font-bold uppercase transition ${
                format === 'feed'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Post 1:1
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-neutral-950/80 min-h-[300px]">
          <div className="relative max-h-[50vh] sm:max-h-[58vh] flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden border border-neutral-800">
            <canvas
              ref={canvasRef}
              className="max-h-[50vh] sm:max-h-[58vh] w-auto h-auto object-contain block rounded-2xl"
            />
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-3.5 sm:p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-neutral-400 hidden sm:block">
            Resolución: {format === 'story' ? '1080 × 1920 px' : '1080 × 1080 px'}
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-display font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-neutral-700 transition active:scale-95"
            >
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>Compartir</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-display font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition active:scale-95 shadow-tactile-sm"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
